import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { BillingError, CATALOG_VERSION, authenticatedUser, catalogPrice, database, stripeClient, vatRate } from "./_lib/billing.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_COST = 10;
const BCRYPT_MAX_BYTES = 72;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

async function checkoutSession(
  email: string,
  billing_period: "monthly" | "annual",
  myweb: boolean,
  metadata: Record<string, string>,
) {
  const stripe = stripeClient();
  const taxRate = await vatRate(stripe);
  const items = [{ price: catalogPrice("professional", billing_period), quantity: 1 }];
  if (myweb) items.push({ price: catalogPrice("myweb", billing_period), quantity: 1 });
  const baseUrl = process.env.APP_BASE_URL || "https://mocklab.app";
  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: items,
    subscription_data: { default_tax_rates: [taxRate], metadata },
    metadata,
    success_url: `${baseUrl}/login?registration=success`,
    cancel_url: `${baseUrl}/register?payment=cancelled`,
  });
}

// Register-after-payment (odd/tasks/registro-tras-pago.md, T3): nothing is created in
// Supabase Auth or userData here. The password is kept only as a bcrypt hash in the
// server-only pending_registrations table; stripe-webhook creates the account once paid.
async function createPendingRegistrationCheckout(body: Record<string, unknown>, res: VercelResponse) {
  const email = text(body.email).toLowerCase();
  const first_name = text(body.first_name);
  const last_name = text(body.last_name);
  const phone = text(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  const { plan_type = "professional", billing_period, myweb = false } = body;

  if (
    first_name.length < 2 || last_name.length < 2 || !EMAIL_PATTERN.test(email) || phone.length < 6 ||
    password.length < 6 || Buffer.byteLength(password, "utf8") > BCRYPT_MAX_BYTES
  ) {
    return res.status(400).json({ error: "Invalid registration data" });
  }
  if (plan_type !== "professional" || (billing_period !== "monthly" && billing_period !== "annual") || typeof myweb !== "boolean") {
    return res.status(400).json({ error: "Invalid plan type, billing period or myWeb selection" });
  }

  const db = database();
  const [{ data: authUsers, error: authError }, { data: profile, error: profileError }] = await Promise.all([
    db.rpc("registration_auth_user_id", { p_email: email }),
    db.from("userData").select("uid").eq("email", email).maybeSingle(),
  ]);
  if (authError || profileError) throw new Error("Could not check existing accounts");
  if ((Array.isArray(authUsers) && authUsers.length > 0) || profile) {
    return res.status(409).json({ error: "email_already_exists" });
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_COST);

  // Earlier unpaid registrations for this email are left alone: deleting them here would let
  // anyone cancel another person's in-flight checkout. They expire and the daily cleanup drops them.
  const { data: pending, error: pendingError } = await db
    .from("pending_registrations")
    .insert({ email, first_name, last_name, phone, password_hash, billing_period, myweb })
    .select("id")
    .single();
  if (pendingError || !pending) throw new Error("Could not store pending registration");

  const session = await checkoutSession(email, billing_period, myweb, {
    pending_registration_id: pending.id,
    plan_type: "professional",
    billing_period,
    catalog_version: CATALOG_VERSION,
    manual_has_web: "false",
  });
  return res.status(200).json({ url: session.url });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    if (!req.body?.uid) return await createPendingRegistrationCheckout(req.body ?? {}, res);

    // Existing account starting a subscription (Settings → Subscription, startSubscription).
    // Always requires the account's own session: accounts are no longer created before payment.
    const { uid, email, plan_type, billing_period, myweb = false } = req.body ?? {};
    if (!uid || !email || !plan_type || !billing_period) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (plan_type !== "professional" || !["monthly", "annual"].includes(billing_period) || typeof myweb !== "boolean") {
      return res.status(400).json({ error: "Invalid plan type, billing period or myWeb selection" });
    }

    const { user } = await authenticatedUser(req);
    if (user.id !== uid) throw new BillingError(403, "Forbidden");

    const db = database();
    const { data: profile, error: profileError } = await db.from("userData")
      .select("uid, email, first_name, last_name, phone, active, has_web").eq("uid", uid).single();
    if (profileError || !profile || profile.email.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(400).json({ error: "Invalid registration profile" });
    }
    const { data: existing, error: existingError } = await db.from("subscriptions")
      .select("stripe_subscription_id").eq("user_id", uid).in("status", ["active", "trialing", "past_due", "incomplete"]);
    if (existingError) throw new Error("Could not check existing subscriptions");
    if (existing?.length) throw new BillingError(409, "A subscription already exists; manage it in settings");

    const metadata = {
      uid, email: profile.email, first_name: profile.first_name || "", last_name: profile.last_name || "",
      phone: profile.phone || "", plan_type: "professional", billing_period, catalog_version: CATALOG_VERSION,
      manual_has_web: String(profile.has_web === true),
    };
    const session = await checkoutSession(profile.email, billing_period, myweb, metadata);
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(error instanceof BillingError ? error.status : 500)
      .json({ error: error instanceof BillingError ? error.message : "Internal server error" });
  }
}
