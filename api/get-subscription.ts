import type { VercelRequest, VercelResponse } from "@vercel/node";
import { BillingError, CATALOG_VERSION, authenticatedUser, newBaseItem, stripeClient, webAccess, webItem } from "./_lib/billing.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "no-store");
  try {
    const { db, user } = await authenticatedUser(req);
    const { data: record, error } = await db.from("subscriptions").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!record) return res.status(200).json(null);
    const stripe = stripeClient();
    const subscription = await stripe.subscriptions.retrieve(record.stripe_subscription_id);
    const base = newBaseItem(subscription);
    const web = webItem(subscription);
    let webCancelAt: string | null = null;
    if (base && web && subscription.schedule) {
      const id = typeof subscription.schedule === "string" ? subscription.schedule : subscription.schedule.id;
      const schedule = await stripe.subscriptionSchedules.retrieve(id);
      const next = schedule.phases.find(phase => phase.start_date >= (base.current_period_end ?? 0));
      if (next && !next.items.some(item => (typeof item.price === "string" ? item.price : item.price.id) === web.price.id)) {
        webCancelAt = new Date(next.start_date * 1000).toISOString();
      }
    }
    const item = base ?? subscription.items.data[0];
    const iso = (value: number | undefined) => value ? new Date(value * 1000).toISOString() : null;
    return res.status(200).json({
      ...record,
      status: ["active", "trialing"].includes(subscription.status) ? "active"
        : subscription.status === "canceled" ? "cancelled" : subscription.status,
      current_period_start: iso(item?.current_period_start),
      current_period_end: iso(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end || !!(subscription.cancel_at && item && subscription.cancel_at <= item.current_period_end),
      catalog_version: base ? CATALOG_VERSION : "legacy",
      amount_excluding_tax: subscription.items.data.reduce((total, line) => total + (line.price.unit_amount ?? 0) * (line.quantity ?? 1), 0),
      currency: subscription.currency,
      myweb: !!web,
      myweb_cancel_at: webCancelAt,
      myweb_payment_url: subscription.pending_update && typeof subscription.latest_invoice === "string"
        ? (await stripe.invoices.retrieve(subscription.latest_invoice)).hosted_invoice_url : null,
      ...(base ? { has_web: webAccess(subscription) } : {}),
    });
  } catch (error) {
    console.error("Error retrieving subscription:", error);
    return res.status(error instanceof BillingError ? error.status : 500)
      .json({ error: error instanceof BillingError ? error.message : "Could not retrieve subscription" });
  }
}
