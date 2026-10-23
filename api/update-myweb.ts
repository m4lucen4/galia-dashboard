import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { BillingError, CATALOG_VERSION, catalogPrice, newBaseItem, ownedSubscription, vatRate, webItem } from "./_lib/billing.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { stripe_subscription_id, enabled } = req.body ?? {};
    if (typeof enabled !== "boolean") throw new BillingError(400, "enabled must be a boolean");
    const { stripe, subscription } = await ownedSubscription(req, stripe_subscription_id);
    const base = newBaseItem(subscription);
    const web = webItem(subscription);
    if (!base || subscription.metadata.catalog_version !== CATALOG_VERSION) {
      throw new BillingError(409, "Legacy subscriptions are unchanged; contact support to change your offering");
    }
    if (!["active", "trialing"].includes(subscription.status) || subscription.cancel_at_period_end || subscription.cancel_at) {
      throw new BillingError(409, "Only an active subscription without scheduled cancellation can be changed");
    }
    if (subscription.pending_update) throw new BillingError(409, "Complete the pending payment before changing myWeb");
    if (subscription.schedule) throw new BillingError(409, "A subscription change is already scheduled");
    if (enabled === !!web) return res.status(200).json({ success: true });
    const cadence = base.price.recurring?.interval === "year" ? "annual" : "monthly";
    const taxRate = await vatRate(stripe);
    if (subscription.default_tax_rates?.length !== 1 || subscription.default_tax_rates[0].id !== taxRate) {
      throw new BillingError(409, "Subscription tax configuration must be reviewed before changing myWeb");
    }
    // Do not overwrite custom changes made outside this application.
    if (subscription.items.data.length !== (web ? 2 : 1) || subscription.discounts.length || subscription.pause_collection) {
      throw new BillingError(409, "Custom subscription configuration requires support");
    }
    const boundary = base.current_period_end;
    if (!boundary) throw new BillingError(409, "Subscription renewal date is unavailable");
    if (enabled) {
      const updated = await stripe.subscriptions.update(subscription.id, {
        items: [{ price: catalogPrice("myweb", cadence), quantity: 1 }],
        payment_behavior: "pending_if_incomplete",
        proration_behavior: "always_invoice",
      }, { idempotencyKey: `myweb:add:${subscription.id}:${boundary}` });
      const invoice = typeof updated.latest_invoice === "string"
        ? await stripe.invoices.retrieve(updated.latest_invoice) : updated.latest_invoice;
      return res.status(200).json({
        success: true,
        pending_payment: !!updated.pending_update,
        payment_url: updated.pending_update ? invoice?.hosted_invoice_url : null,
      });
    }
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscription.id }, {
      // A compensated attempt releases its schedule; the next attempt must not replay that released object.
      idempotencyKey: `myweb:remove:${subscription.id}:${boundary}:${randomUUID()}`,
    });
    const current = schedule.phases[0];
    const items = subscription.items.data.map(item => ({ price: item.price.id, quantity: item.quantity ?? 1 }));
    // A Stripe schedule executes the removal; a local flag alone would still renew the extra.
    try {
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "release",
        metadata: { managed_by: CATALOG_VERSION, myweb_remove_at: String(boundary) },
        proration_behavior: "none",
        phases: [
          {
            start_date: current.start_date, end_date: boundary, items,
            default_tax_rates: [taxRate], proration_behavior: "none",
            ...(subscription.trial_end && subscription.trial_end > Date.now() / 1000 ? { trial_end: subscription.trial_end } : {}),
          },
          {
            start_date: boundary, items: [{ price: base.price.id, quantity: base.quantity ?? 1 }],
            default_tax_rates: [taxRate], proration_behavior: "none",
            duration: { interval: cadence === "annual" ? "year" : "month", interval_count: 1 },
          },
        ],
      });
    } catch (configurationError) {
      let removalConfirmed = false;
      try {
        // An interrupted response may hide a successful Stripe update. Reconcile before undoing anything.
        const latest = await stripe.subscriptionSchedules.retrieve(schedule.id);
        const next = latest.phases.find(phase => phase.start_date === boundary);
        const nextTaxRate = next?.default_tax_rates?.[0];
        removalConfirmed = latest.metadata?.managed_by === CATALOG_VERSION
          && latest.metadata.myweb_remove_at === String(boundary)
          && next?.items.length === 1
          && (typeof next.items[0].price === "string" ? next.items[0].price : next.items[0].price.id) === base.price.id
          && (next.items[0].quantity ?? 1) === (base.quantity ?? 1)
          && next.default_tax_rates?.length === 1
          && (typeof nextTaxRate === "string" ? nextTaxRate : nextTaxRate?.id) === taxRate;
        if (!removalConfirmed) {
          const attached = typeof latest.subscription === "string" ? latest.subscription : latest.subscription?.id;
          if (attached !== subscription.id || Object.keys(latest.metadata ?? {}).length
            || JSON.stringify(latest.phases) !== JSON.stringify(schedule.phases)) {
            throw new Error("Schedule changed outside this removal attempt");
          }
          // Release only our unchanged bootstrap schedule, never cancel the underlying subscription.
          await stripe.subscriptionSchedules.release(schedule.id);
        }
      } catch (recoveryError) {
        console.error("Could not confirm myWeb removal configuration:", recoveryError);
        throw new BillingError(503, "myWeb removal was not confirmed; refresh the subscription before retrying or contact support");
      }
      if (!removalConfirmed) throw configurationError;
    }
    return res.status(200).json({ success: true, removal_at: new Date(boundary * 1000).toISOString() });
  } catch (error) {
    console.error("Error changing myWeb:", error);
    return res.status(error instanceof BillingError ? error.status : 500)
      .json({ error: error instanceof BillingError ? error.message : "Could not change myWeb" });
  }
}
