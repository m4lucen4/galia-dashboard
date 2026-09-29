/* eslint-disable */
// deno-lint-ignore-file
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const n8nWebhook = Deno.env.get("N8N_CREATE_PROJECT_WEBHOOK")!;

async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=");
    parts[key] = value;
  }

  const timestamp = parts["t"];
  const sig = parts["v1"];
  if (!timestamp || !sig) return false;

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

  return computedSig === sig;
}

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  return res.json();
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
  const valid = await verifyStripeSignature(body, signature, webhookSecret);
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, supabase);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object, supabase);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object, supabase);
        break;
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

async function handleCheckoutCompleted(session: any, supabase: any) {
  const metadata = session.metadata || {};
  const { uid, email, first_name, last_name, plan_type, billing_period } = metadata;

  if (!uid || !email) {
    console.error("Missing metadata in checkout session");
    return;
  }

  const stripeCustomerId = session.customer;
  const stripeSubscriptionId = session.subscription;

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

  const { error: activateError } = await supabase
    .from("userData")
    .update({ active: true })
    .eq("uid", uid);

  if (activateError) console.error("Error activating user:", activateError);

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

  if (subError) console.error("Error creating subscription:", subError);

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

  if (error) { console.error("Error updating subscription:", error); return; }

  if (subRecord?.user_id) {
    await supabase.from("userData").update({ active: status === "active" }).eq("uid", subRecord.user_id);
  }
}

async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  const { data: subRecord, error } = await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .select("user_id")
    .single();

  if (error) { console.error("Error cancelling subscription:", error); return; }

  if (subRecord?.user_id) {
    await supabase.from("userData").update({ active: false }).eq("uid", subRecord.user_id);
  }
}

async function handlePaymentFailed(invoice: any, supabase: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const { data: subRecord } = await supabase
    .from("subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId)
    .select("user_id")
    .single();

  if (subRecord?.user_id) {
    await supabase.from("userData").update({ active: false }).eq("uid", subRecord.user_id);
  }
}
