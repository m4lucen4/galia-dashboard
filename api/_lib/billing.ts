import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

export const CATALOG_VERSION = "profesional_myweb_v1";
export type Cadence = "monthly" | "annual";

export class BillingError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Stripe 22's CommonJS types describe a callable factory, but its ESM export
// is a class. Both runtime exports support construction with `new`.
const StripeConstructor = Stripe as unknown as new (key: string) => ReturnType<typeof Stripe>;

export function stripeClient() {
  return new StripeConstructor(process.env.STRIPE_SECRET_KEY!);
}

export function database() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function authenticatedUser(req: VercelRequest) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new BillingError(401, "Unauthorized");
  const db = database();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) throw new BillingError(401, "Invalid token");
  return { db, user };
}

export function catalogPrice(component: "professional" | "myweb", cadence: Cadence) {
  const key = component === "professional" ? "STRIPE_PROFESSIONAL_V1" : "STRIPE_MYWEB";
  const id = process.env[`${key}_${cadence.toUpperCase()}_PRICE_ID`];
  if (!id) throw new BillingError(503, "Subscription catalog is not configured");
  return id;
}

export type LiveSubscription = Awaited<ReturnType<ReturnType<typeof stripeClient>["subscriptions"]["retrieve"]>>;

export function newBaseItem(subscription: LiveSubscription) {
  return subscription.items.data.find(item =>
    ["monthly", "annual"].some(period =>
      item.price.id === process.env[`STRIPE_PROFESSIONAL_V1_${period.toUpperCase()}_PRICE_ID`],
    ),
  );
}

export function webItem(subscription: LiveSubscription) {
  return subscription.items.data.find(item =>
    ["monthly", "annual"].some(period =>
      item.price.id === process.env[`STRIPE_MYWEB_${period.toUpperCase()}_PRICE_ID`],
    ),
  );
}

export function webAccess(subscription: LiveSubscription) {
  const entitled = ["active", "trialing"].includes(subscription.status);
  return subscription.metadata.manual_has_web === "true" || (entitled && !!webItem(subscription));
}

export async function vatRate(stripe: ReturnType<typeof stripeClient>) {
  const id = process.env.STRIPE_VAT_21_TAX_RATE_ID;
  if (!id) throw new BillingError(503, "The exclusive 21% VAT rate is not configured");
  const rate = await stripe.taxRates.retrieve(id);
  if (!rate.active || rate.inclusive || rate.percentage !== 21) {
    throw new BillingError(503, "An active, exclusive 21% VAT rate is required");
  }
  return id;
}

export async function ownedSubscription(req: VercelRequest, subscriptionId: unknown) {
  const { db, user } = await authenticatedUser(req);
  if (typeof subscriptionId !== "string" || !subscriptionId.startsWith("sub_")) {
    throw new BillingError(400, "stripe_subscription_id is required");
  }
  const { data, error } = await db.from("subscriptions").select("user_id")
    .eq("stripe_subscription_id", subscriptionId).single();
  if (error || !data) throw new BillingError(404, "Subscription not found");
  if (data.user_id !== user.id) throw new BillingError(403, "Forbidden");
  const stripe = stripeClient();
  return { stripe, db, user, subscription: await stripe.subscriptions.retrieve(subscriptionId) };
}
