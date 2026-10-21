import type { VercelRequest, VercelResponse } from "@vercel/node";
import { BillingError, CATALOG_VERSION, authenticatedUser, catalogPrice, database, stripeClient, vatRate } from "./_lib/billing";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { uid, email, plan_type, billing_period, myweb = false } = req.body ?? {};
    if (!uid || !email || !plan_type || !billing_period) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (plan_type !== "professional" || !["monthly", "annual"].includes(billing_period) || typeof myweb !== "boolean") {
      return res.status(400).json({ error: "Invalid plan type, billing period or myWeb selection" });
    }

    const db = database();
    const { data: profile, error: profileError } = await db.from("userData")
      .select("uid, email, first_name, last_name, phone, active, has_web").eq("uid", uid).single();
    if (profileError || !profile || profile.email.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(400).json({ error: "Invalid registration profile" });
    }
    // New registrations can still check out before email confirmation. Existing active users must authenticate.
    if (profile.active || req.headers.authorization) {
      const { user } = await authenticatedUser(req);
      if (user.id !== uid) throw new BillingError(403, "Forbidden");
    }
    const { data: existing, error: existingError } = await db.from("subscriptions")
      .select("stripe_subscription_id").eq("user_id", uid).in("status", ["active", "trialing", "past_due", "incomplete"]);
    if (existingError) throw new Error("Could not check existing subscriptions");
    if (existing?.length) throw new BillingError(409, "A subscription already exists; manage it in settings");

    const stripe = stripeClient();
    const taxRate = await vatRate(stripe);
    const items = [{ price: catalogPrice("professional", billing_period), quantity: 1 }];
    if (myweb) items.push({ price: catalogPrice("myweb", billing_period), quantity: 1 });
    const metadata = {
      uid, email: profile.email, first_name: profile.first_name || "", last_name: profile.last_name || "",
      phone: profile.phone || "", plan_type: "professional", billing_period, catalog_version: CATALOG_VERSION,
      manual_has_web: String(profile.has_web === true),
    };
    const baseUrl = process.env.APP_BASE_URL || "https://mocklab.app";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: profile.email,
      line_items: items,
      subscription_data: { default_tax_rates: [taxRate], metadata },
      metadata,
      success_url: `${baseUrl}/login?registration=success`,
      cancel_url: `${baseUrl}/register?payment=cancelled`,
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(error instanceof BillingError ? error.status : 500)
      .json({ error: error instanceof BillingError ? error.message : "Internal server error" });
  }
}
