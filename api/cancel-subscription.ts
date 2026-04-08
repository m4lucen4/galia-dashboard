import Stripe = require("stripe");
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe: any = Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate the user's JWT
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { stripe_subscription_id } = req.body;

    if (!stripe_subscription_id) {
      return res.status(400).json({ error: "stripe_subscription_id is required" });
    }

    // Verify the subscription belongs to this user
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", stripe_subscription_id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    if (subscription.user_id !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Cancel at period end (not immediately)
    await stripe.subscriptions.update(stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
