/* eslint-disable */
// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-03-31.basil",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const n8nWebhook = Deno.env.get("N8N_CREATE_PROJECT_WEBHOOK")!;

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

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing event ${event.type}:`, err);
    return new Response(`Error: ${err}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>,
) {
  const metadata = session.metadata || {};
  const { uid, email, first_name, last_name, plan_type, billing_period, student_card_url } = metadata;

  if (!uid || !email) {
    console.error("Missing metadata in checkout session");
    return;
  }

  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;

  // Retrieve subscription to get period info
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // Activate user
  const { error: activateError } = await supabase
    .from("userData")
    .update({ active: true })
    .eq("uid", uid);

  if (activateError) {
    console.error("Error activating user:", activateError);
  }

  // Create subscription record (idempotent via ON CONFLICT)
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
        student_card_url: student_card_url || null,
      },
      { onConflict: "stripe_subscription_id" },
    );

  if (subError) {
    console.error("Error creating subscription record:", subError);
  }

  // Send welcome email via Resend
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
              <a href="https://mocklab.app/login"
                 style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Acceder a Mocklab
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Si tienes cualquier pregunta, no dudes en contactarnos.</p>
          </div>
        `,
      }),
    });
  } catch (emailErr) {
    console.error("Error sending welcome email:", emailErr);
  }

  // Trigger n8n project creation webhook
  if (n8nWebhook) {
    try {
      // Get internal user id (not uid)
      const { data: userData } = await supabase
        .from("userData")
        .select("id")
        .eq("uid", uid)
        .single();

      if (userData?.id) {
        await fetch(`${n8nWebhook}?id=${userData.id}`);
      }
    } catch (webhookErr) {
      console.error("Error triggering n8n webhook:", webhookErr);
    }
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
) {
  const stripeStatus = subscription.status;
  let status: string;

  if (stripeStatus === "active") {
    status = "active";
  } else if (stripeStatus === "past_due") {
    status = "past_due";
  } else {
    status = stripeStatus;
  }

  const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  const { data: subRecord, error: fetchError } = await supabase
    .from("subscriptions")
    .update({
      status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .select("user_id")
    .single();

  if (fetchError) {
    console.error("Error updating subscription:", fetchError);
    return;
  }

  // Update user active status based on subscription status
  if (subRecord?.user_id) {
    const isActive = status === "active";
    await supabase
      .from("userData")
      .update({ active: isActive })
      .eq("uid", subRecord.user_id);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createClient>,
) {
  const { data: subRecord, error: fetchError } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .select("user_id")
    .single();

  if (fetchError) {
    console.error("Error marking subscription as cancelled:", fetchError);
    return;
  }

  if (subRecord?.user_id) {
    await supabase
      .from("userData")
      .update({ active: false })
      .eq("uid", subRecord.user_id);
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createClient>,
) {
  const subscriptionId = (invoice as any).subscription as string;
  if (!subscriptionId) return;

  await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);
}
