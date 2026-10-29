import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, subscriptionTotals } from "@/helpers/subscriptionPricing";
import type { PlanSelector } from "./PlanSelector";

type RegistrationMembershipsProps = ComponentProps<typeof PlanSelector>;

export const RegistrationMemberships = ({ selectedPeriod, myweb, onPeriodChange, onMyWebChange }: RegistrationMembershipsProps) => {
  const { t, i18n } = useTranslation();
  const prices = subscriptionTotals(selectedPeriod, myweb);
  const money = (amount: number) => formatMoney(amount, i18n.language);
  const period = selectedPeriod === "monthly" ? t("register.priceMonthly") : t("register.priceAnnual");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-[28px] border border-[#010000]/30 p-1.5" role="group" aria-label={t("settings.billingPeriod")}>
        {(["monthly", "annual"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={selectedPeriod === value} onClick={() => onPeriodChange(value)}
            className={`min-h-12 min-w-0 rounded-full px-3 py-2 text-sm leading-tight font-medium ${selectedPeriod === value ? "bg-[#010000] text-[#d8e4d6]" : "hover:bg-[#d8e4d6]"}`}>
            {t(`register.${value}`)} {value === "annual" && <span className="block text-xs">{t("register.annualSaving")}</span>}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-3xl border-[1.5px] border-[#010000]/30 bg-[#d8e4d6] p-5">
          <h3 className="text-2xl font-medium tracking-[-0.03em]">{t("register.professional")}</h3>
          <p className="mt-2 text-sm text-[#010000]/70">{t("register.professionalDescription")}</p>
          <p className="mt-6 flex flex-wrap items-baseline gap-1">
            <span className="font-['Geist_Mono',monospace] text-3xl tracking-[-0.04em]">{money(prices.item)}</span>
            <span className="text-sm">{period}</span>
          </p>
          <p className="mt-1 text-xs text-[#010000]/70">{t("billing.excludingVat")}</p>
        </div>
        <label className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-3xl border-[1.5px] p-5 ${myweb ? "border-[#010000] bg-[#fbea71]" : "border-[#010000]/30 bg-[#d8e4d6]"}`}>
          <input type="checkbox" checked={myweb} onChange={(event) => onMyWebChange(event.target.checked)} className="mt-1 size-5 shrink-0 cursor-pointer accent-[#010000]" />
          <span className="min-w-0">
            <span className="block text-base font-medium">{t("billing.optionalMyWeb")}</span>
            <span className="mt-1 block text-sm text-[#010000]/70">{t("billing.myWebDescription")}</span>
            <span className="mt-4 block font-['Geist_Mono',monospace] text-sm">+ {money(prices.item)}{period}</span>
            <span className="mt-1 block text-xs text-[#010000]/70">{t("billing.excludingVat")}</span>
          </span>
        </label>
      </div>
      <div className="rounded-3xl bg-[#010000] p-5 text-[#d8e4d6]">
        <dl>
          <div className="flex flex-wrap justify-between gap-3">
            <dt className="text-sm">{t("billing.subtotal")}</dt>
            <dd className="font-['Geist_Mono',monospace] text-base">{money(prices.net)}{period}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs">{t("billing.vatAtCheckout")}</p>
      </div>
    </div>
  );
};
