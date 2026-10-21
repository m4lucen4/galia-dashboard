import type { BillingPeriod } from "@/types";

export const SUBSCRIPTION_PRICES = { monthly: 1850, annual: 17760 } as const;
export function subscriptionTotals(period: BillingPeriod, myweb: boolean) {
  const item = SUBSCRIPTION_PRICES[period];
  const net = item * (myweb ? 2 : 1);
  return { item, net };
}

export function formatMoney(cents: number, language = "es", currency = "EUR") {
  return new Intl.NumberFormat(language === "cat" ? "ca" : language, { style: "currency", currency }).format(cents / 100);
}
