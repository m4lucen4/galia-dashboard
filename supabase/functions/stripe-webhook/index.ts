/* eslint-disable */
// deno-lint-ignore-file
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const n8nWebhook = Deno.env.get("N8N_CREATE_PROJECT_WEBHOOK")!;

// Stripe's default tolerance: reject signatures older or newer than 5 minutes (replays).
const SIGNATURE_TOLERANCE_SECONDS = 300;

type SignatureCheck = "valid" | "invalid" | "stale";

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<SignatureCheck> {
  if (!secret) return "invalid";

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of signature.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t") timestamp = value;
    // Stripe sends several v1 signatures while a webhook secret is being rolled.
    if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return "invalid";
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return "stale";

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computedSig = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((sig) => timingSafeEqualHex(computedSig, sig)) ? "valid" : "invalid";
}

// PostgREST returns PGRST116 when .single() matches no row: retrying cannot fix that.
function isNoRowsError(error: any): boolean {
  return error?.code === "PGRST116";
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  if (!res.ok) throw new Error(`Stripe lookup failed (${res.status})`);
  return res.json();
}

async function stripePost(path: string, params: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) throw new Error(`Stripe update failed (${res.status})`);
  return res.json();
}

const PENDING_REGISTRATION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

type ProvisionedUser = { uid: string; email: string; first_name: string; last_name: string };

// Register-after-payment: create the account for a paid pending registration.
// Idempotent across Stripe retries: the created uid is stored on the pending row
// right away and every later write tolerates an existing user/profile.
async function provisionPendingRegistration(pendingId: string, subscriptionId: string, supabase: any): Promise<ProvisionedUser | null> {
  const { data: pending, error } = await supabase
    .from("pending_registrations")
    .select("id, email, first_name, last_name, phone, password_hash, user_id, consumed_at")
    .eq("id", pendingId)
    .maybeSingle();
  if (error) throw new Error(`Error loading pending registration: ${error.message}`);
  if (!pending) {
    // Retrying cannot fix this: a payment arrived without registration data.
    console.error(`CRITICAL: paid checkout without pending registration ${pendingId} (subscription ${subscriptionId}); create the account manually`);
    return null;
  }

  // Keep the row while Stripe may still retry this event (up to 3 days).
  if (!pending.consumed_at) {
    const { error: extendError } = await supabase
      .from("pending_registrations")
      .update({ expires_at: new Date(Date.now() + PENDING_REGISTRATION_GRACE_MS).toISOString() })
      .eq("id", pending.id);
    if (extendError) throw new Error(`Error extending pending registration: ${extendError.message}`);
  }

  let uid: string | null = pending.user_id;
  if (!uid) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: pending.email,
      password_hash: pending.password_hash,
      email_confirm: true,
    });
    if (created?.user?.id) {
      uid = created.user.id;
    } else if (createError?.code === "email_exists" || createError?.status === 422) {
      // A previous attempt created the auth user but failed before storing its uid.
      const { data: existingId, error: lookupError } = await supabase.rpc("registration_auth_user_id", { p_email: pending.email });
      if (lookupError || !existingId) throw new Error(`Auth user exists but could not be resolved: ${lookupError?.message ?? "not found"}`);
      console.error(`Pending registration ${pending.id} reused existing auth user ${existingId}`);
      uid = existingId;
    } else {
      throw new Error(`Error creating auth user: ${createError?.message ?? "unknown"}`);
    }

    const { error: linkError } = await supabase
      .from("pending_registrations")
      .update({ user_id: uid })
      .eq("id", pending.id);
    if (linkError) throw new Error(`Error linking pending registration: ${linkError.message}`);
  }

  const { error: profileError } = await supabase.from("userData").upsert(
    {
      uid,
      email: pending.email,
      first_name: pending.first_name,
      last_name: pending.last_name,
      phone: pending.phone,
      role: "customer",
      active: false,
      has_web: false,
      avatar_url: "",
      company: "",
      vat: "",
      description: "",
    },
    { onConflict: "uid", ignoreDuplicates: true },
  );
  if (profileError) throw new Error(`Error creating user profile: ${profileError.message}`);

  // Later subscription events resolve the account through this metadata.
  await stripePost(`/subscriptions/${subscriptionId}`, { "metadata[uid]": uid! });

  return { uid: uid!, email: pending.email, first_name: pending.first_name, last_name: pending.last_name };
}

async function consumePendingRegistration(pendingId: string, supabase: any) {
  const { error } = await supabase
    .from("pending_registrations")
    .update({ consumed_at: new Date().toISOString(), password_hash: "" })
    .eq("id", pendingId)
    .is("consumed_at", null);
  if (error) throw new Error(`Error consuming pending registration: ${error.message}`);
}

// Records the event before one-time side effects (welcome email, n8n call).
// Returns false when a previous delivery of the same event already did them.
async function claimEventSideEffects(event: any, supabase: any): Promise<boolean> {
  const { error } = await supabase
    .from("stripe_webhook_events")
    .insert({ event_id: event.id, type: event.type });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(`Error recording webhook event: ${error.message}`);
}

const catalogVersion = "profesional_myweb_v1";

function newPriceIds(component: "PROFESSIONAL_V1" | "MYWEB") {
  return ["MONTHLY", "ANNUAL"].map(period => Deno.env.get(`STRIPE_${component}_${period}_PRICE_ID`)).filter(Boolean);
}

// Claim durable ownership before the authoritative read. Reading Stripe alone does not
// stop an older overlapping invocation from writing a stale entitlement last.
async function syncNewSubscription(subscriptionId: string, supabase: any) {
  const candidate = await stripeGet(`/subscriptions/${subscriptionId}`);
  if (candidate.metadata?.catalog_version !== catalogVersion) return false;
  const ownerToken = crypto.randomUUID();
  const args = { p_subscription_id: subscriptionId, p_owner_token: ownerToken };
  const { data: claimed, error: claimError } = await supabase.rpc("claim_subscription_projection", args);
  if (claimError) throw claimError;
  if (!claimed) throw new Error("Subscription projection busy; Stripe must retry this event");
  let applied = false;
  try {
    const subscription = await stripeGet(`/subscriptions/${subscriptionId}`);
    if (subscription.metadata?.catalog_version !== catalogVersion) throw new Error("Subscription catalog changed during projection");
    const uid = subscription.metadata.uid;
    if (newPriceIds("PROFESSIONAL_V1").length !== 2 || newPriceIds("MYWEB").length !== 2) {
      throw new Error("All four new catalog price IDs must be configured");
    }
    const base = subscription.items?.data?.find((item: any) => newPriceIds("PROFESSIONAL_V1").includes(item.price?.id));
    if (!uid || !base) throw new Error("New subscription catalog configuration is missing or invalid");
    const web = subscription.items.data.find((item: any) => newPriceIds("MYWEB").includes(item.price?.id));
    const active = ["active", "trialing"].includes(subscription.status);
    const iso = (value: number | null) => value ? new Date(value * 1000).toISOString() : null;
    const { data, error } = await supabase.rpc("apply_subscription_projection", {
      ...args,
      p_projection: {
        user_id: uid,
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        billing_period: base.price.recurring.interval === "year" ? "annual" : "monthly",
        status: active ? "active" : subscription.status === "canceled" ? "cancelled" : subscription.status,
        current_period_start: iso(base.current_period_start ?? subscription.current_period_start),
        current_period_end: iso(base.current_period_end ?? subscription.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end || !!(subscription.cancel_at && subscription.cancel_at <= (base.current_period_end ?? subscription.current_period_end)),
        active,
        has_web: subscription.metadata.manual_has_web === "true" || (active && !!web),
      },
    });
    if (error) throw error;
    if (!data) throw new Error("Subscription projection lease expired; Stripe must retry this event");
    applied = true;
    return true;
  } finally {
    if (!applied) {
      const { error } = await supabase.rpc("release_subscription_projection", args);
      if (error) console.error("Could not release projection lease; it will expire:", error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, stripe-signature",
      },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();
  const check = await verifyStripeSignature(body, signature, webhookSecret);
  if (check === "stale") {
    return new Response("Signature timestamp outside tolerance", { status: 400 });
  }
  if (check !== "valid") {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, supabase, event);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.pending_update_applied":
      case "customer.subscription.pending_update_expired":
        if (await syncNewSubscription(event.data.object.id, supabase)) break;
        await handleSubscriptionUpdated(event.data.object, supabase);
        break;
      case "customer.subscription.deleted":
        if (await syncNewSubscription(event.data.object.id, supabase)) break;
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;
      case "invoice.payment_failed":
      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
        if (subscriptionId && await syncNewSubscription(subscriptionId, supabase)) break;
        if (event.type === "invoice.payment_failed") await handlePaymentFailed(subscriptionId, supabase);
        break;
      }
      default:
        console.error(`Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    return new Response(`Error: ${err}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function handleCheckoutCompleted(session: any, supabase: any, event: any) {
  const metadata = session.metadata || {};
  let { uid, email, first_name, last_name } = metadata;
  const { plan_type, billing_period, pending_registration_id } = metadata;

  const stripeCustomerId = session.customer;
  const stripeSubscriptionId = session.subscription;

  if (!uid && pending_registration_id && stripeSubscriptionId) {
    const provisioned = await provisionPendingRegistration(pending_registration_id, stripeSubscriptionId, supabase);
    if (!provisioned) return;
    ({ uid, email, first_name, last_name } = provisioned);
  }

  if (!uid || !email) {
    console.error("Missing metadata in checkout session");
    return;
  }

  const subscription = await stripeGet(`/subscriptions/${stripeSubscriptionId}?expand[]=items`);
  const subItem = subscription.items?.data?.[0];

  const periodEnd = subscription.current_period_end
    ?? subItem?.current_period_end
    ?? subscription.billing_cycle_anchor
    ?? null;

  const periodStart = subscription.current_period_start
    ?? subItem?.current_period_start
    ?? subscription.billing_cycle_anchor
    ?? null;

  const currentPeriodStart = periodStart ? new Date(periodStart * 1000).toISOString() : null;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const isNewCatalog = subscription.metadata?.catalog_version === catalogVersion;
  if (isNewCatalog) {
    await syncNewSubscription(stripeSubscriptionId, supabase);
  } else {
  const { error: activateError } = await supabase
    .from("userData")
    .update({ active: true })
    .eq("uid", uid);

  // Throw so the handler answers 500 and Stripe retries instead of leaving a paid user inactive.
  if (activateError) throw new Error(`Error activating user: ${activateError.message}`);

  const { error: subError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: uid,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan_type,
        billing_period,
        status: "active",
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
      },
      { onConflict: "stripe_subscription_id" },
    );

  if (subError) throw new Error(`Error creating subscription: ${subError.message}`);
  }

  if (pending_registration_id) await consumePendingRegistration(pending_registration_id, supabase);

  if (!(await claimEventSideEffects(event, supabase))) {
    console.error(`Event ${event.id} already processed; skipping welcome email and n8n call`);
    return;
  }

  try {
    const fullName = [first_name, last_name].filter(Boolean).join(" ") || "Usuario";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mocklab <noreply@mocklab.app>",
        to: [email],
        subject: "Bienvenido a Mocklab",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #007bff;">¡Bienvenido a Mocklab, ${fullName}!</h1>
            <p>Tu cuenta ha sido activada correctamente. Ya puedes acceder con tu correo electrónico y la contraseña que elegiste durante el registro.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://mocklab.app/login" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Acceder a Mocklab
              </a>
            </div>
          </div>
        `,
      }),
    });
  } catch (emailErr) {
    console.error("Error sending welcome email:", emailErr);
  }

  if (n8nWebhook) {
    try {
      const { data: userData } = await supabase
        .from("userData")
        .select("id")
        .eq("uid", uid)
        .single();
      if (userData?.id) await fetch(`${n8nWebhook}?id=${userData.id}`);
    } catch (err) {
      console.error("Error triggering n8n:", err);
    }
  }
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  const PRICE_MAP: Record<string, { plan_type: string; billing_period: string }> = {
    [Deno.env.get("STRIPE_STUDENT_MONTHLY_PRICE_ID")!]:      { plan_type: "student",      billing_period: "monthly" },
    [Deno.env.get("STRIPE_STUDENT_ANNUAL_PRICE_ID")!]:       { plan_type: "student",      billing_period: "annual"  },
    [Deno.env.get("STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID")!]: { plan_type: "professional", billing_period: "monthly" },
    [Deno.env.get("STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID")!]:  { plan_type: "professional", billing_period: "annual"  },
  };

  const status = subscription.status === "active" ? "active"
    : subscription.status === "past_due" ? "past_due"
    : subscription.status;

  const subItem = subscription.items?.data?.[0];
  const priceId = subItem?.price?.id;
  const planInfo = priceId ? PRICE_MAP[priceId] : undefined;

  const periodEnd = subscription.current_period_end ?? subItem?.current_period_end ?? null;
  const periodStart = subscription.current_period_start ?? subItem?.current_period_start ?? null;
  const currentPeriodStart = periodStart ? new Date(periodStart * 1000).toISOString() : null;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

  const updatePayload: Record<string, any> = {
    status,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: cancelAtPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  if (planInfo) {
    updatePayload.plan_type = planInfo.plan_type;
    updatePayload.billing_period = planInfo.billing_period;
  }

  const { data: subRecord, error } = await supabase
    .from("subscriptions")
    .update(updatePayload)
    .eq("stripe_subscription_id", subscription.id)
    .select("user_id")
    .single();

  if (error) {
    if (isNoRowsError(error)) { console.error("Subscription not found for update:", subscription.id); return; }
    throw new Error(`Error updating subscription: ${error.message}`);
  }

  if (subRecord?.user_id) {
    const { error: userError } = await supabase.from("userData").update({ active: status === "active" }).eq("uid", subRecord.user_id);
    if (userError) throw new Error(`Error updating user access: ${userError.message}`);
  }
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  const { data: subRecord, error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .select("user_id")
    .single();

  if (error) {
    if (isNoRowsError(error)) { console.error("Subscription not found for cancellation:", subscription.id); return; }
    throw new Error(`Error cancelling subscription: ${error.message}`);
  }

  if (subRecord?.user_id) {
    const { error: userError } = await supabase.from("userData").update({ active: false }).eq("uid", subRecord.user_id);
    if (userError) throw new Error(`Error deactivating user: ${userError.message}`);
  }
}

// subscriptionId is resolved by the caller from invoice.subscription or, on newer Stripe API
// versions, invoice.parent.subscription_details.subscription.
async function handlePaymentFailed(subscriptionId: string | undefined, supabase: any) {
  if (!subscriptionId) return;

  const { data: subRecord, error } = await supabase
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId)
    .select("user_id")
    .single();

  if (error) {
    if (isNoRowsError(error)) { console.error("Subscription not found for failed payment:", subscriptionId); return; }
    throw new Error(`Error marking subscription past_due: ${error.message}`);
  }

  if (subRecord?.user_id) {
    const { error: userError } = await supabase.from("userData").update({ active: false }).eq("uid", subRecord.user_id);
    if (userError) throw new Error(`Error deactivating user: ${userError.message}`);
  }
}
