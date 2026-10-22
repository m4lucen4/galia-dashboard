import { BillingError, CATALOG_VERSION, newBaseItem, stripeClient } from "./billing";

// Keep whole-subscription cancellation compatible with a pending myWeb-only removal.
// Call only after the existing HTTP handler has checked subscription ownership.
export async function setManagedScheduleCancellation(subscriptionId: string, cancel: boolean) {
  const stripe = stripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!newBaseItem(subscription) || !subscription.schedule) return false;
  const id = typeof subscription.schedule === "string" ? subscription.schedule : subscription.schedule.id;
  const schedule = await stripe.subscriptionSchedules.retrieve(id);
  if (schedule.metadata?.managed_by !== CATALOG_VERSION) {
    throw new BillingError(409, "This subscription schedule must be managed through support");
  }
  const boundary = Number(schedule.metadata.myweb_remove_at);
  const current = schedule.phases.find(phase => phase.start_date <= Date.now() / 1000 && phase.end_date > Date.now() / 1000);
  const base = newBaseItem(subscription)!;
  if (!current || !Number.isFinite(boundary) || boundary <= Date.now() / 1000) {
    throw new BillingError(409, "The subscription is renewing; refresh before changing cancellation");
  }
  const taxRates = (subscription.default_tax_rates ?? []).map(rate => rate.id);
  const phase = {
    start_date: current.start_date, end_date: boundary,
    items: subscription.items.data.map(item => ({ price: item.price.id, quantity: item.quantity ?? 1 })),
    default_tax_rates: taxRates, proration_behavior: "none" as const,
    ...(subscription.trial_end && subscription.trial_end > Date.now() / 1000 ? { trial_end: subscription.trial_end } : {}),
  };
  await stripe.subscriptionSchedules.update(id, {
    end_behavior: cancel ? "cancel" : "release",
    proration_behavior: "none",
    phases: cancel ? [phase] : [phase, {
      start_date: boundary, items: [{ price: base.price.id, quantity: base.quantity ?? 1 }],
      default_tax_rates: taxRates, proration_behavior: "none",
      duration: { interval: base.price.recurring?.interval === "year" ? "year" : "month", interval_count: 1 },
    }],
  });
  return true;
}
