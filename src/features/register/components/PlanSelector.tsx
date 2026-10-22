import type { BillingPeriod } from "@/types";
import { useTranslation } from "react-i18next";
import { formatMoney, subscriptionTotals } from "@/helpers/subscriptionPricing";

interface PlanSelectorProps {
  selectedPeriod: BillingPeriod;
  myweb: boolean;
  onPeriodChange: (period: BillingPeriod) => void;
  onMyWebChange: (enabled: boolean) => void;
}

export const PlanSelector: React.FC<PlanSelectorProps> = ({ selectedPeriod, myweb, onPeriodChange, onMyWebChange }) => {
  const { t, i18n } = useTranslation();
  const prices = subscriptionTotals(selectedPeriod, myweb);
  const money = (amount: number) => formatMoney(amount, i18n.language);
  const period = selectedPeriod === "monthly" ? t("register.priceMonthly") : t("register.priceAnnual");

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label={t("settings.billingPeriod")}>
        {(["monthly", "annual"] as const).map(value => (
          <button key={value} type="button" aria-pressed={selectedPeriod === value}
            onClick={() => onPeriodChange(value)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${selectedPeriod === value ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600"}`}>
            {t(`register.${value}`)} {value === "annual" && <span>{t("register.annualSaving")}</span>}
          </button>
        ))}
      </div>
      <div className="rounded-lg border-2 border-gray-900 bg-gray-50 p-4">
        <h4 className="font-semibold text-gray-900">{t("register.professional")}</h4>
        <p className="mt-1 text-xs text-gray-500">{t("register.professionalDescription")}</p>
        <p className="mt-2 text-xl font-bold">{money(prices.item)}<span className="text-xs font-normal text-gray-500">{period}</span></p>
        <p className="text-xs text-gray-500">{t("billing.excludingVat")}</p>
      </div>
      <label className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 ${myweb ? "border-gray-900 bg-gray-50" : "border-gray-200"}`}>
        <input type="checkbox" checked={myweb} onChange={event => onMyWebChange(event.target.checked)} className="mt-1 h-4 w-4 accent-black" />
        <span>
          <span className="block font-semibold">{t("billing.optionalMyWeb")}</span>
          <span className="block text-xs text-gray-500">{t("billing.myWebDescription")}</span>
          <span className="mt-2 block font-semibold">+ {money(prices.item)}{period}</span>
          <span className="block text-xs text-gray-500">{t("billing.excludingVat")}</span>
        </span>
      </label>
      <dl className="space-y-1 rounded-lg bg-gray-50 p-4 text-sm">
        <div className="flex justify-between font-semibold"><dt>{t("billing.subtotal")}</dt><dd>{money(prices.net)}{period}</dd></div>
        <p className="text-xs text-gray-500">{t("billing.vatAtCheckout")}</p>
      </dl>
    </div>
  );
};
