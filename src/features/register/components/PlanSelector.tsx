import { SubscriptionPlanType, BillingPeriod } from "../../../types";
import { useTranslation } from "react-i18next";

interface PlanSelectorProps {
  selectedPlan: SubscriptionPlanType;
  selectedPeriod: BillingPeriod;
  onPlanChange: (plan: SubscriptionPlanType) => void;
  onPeriodChange: (period: BillingPeriod) => void;
}

const PRICES = {
  student: { monthly: "6,05", annual: "50,82" },
  professional: { monthly: "30,25", annual: "254,10" },
};

export const PlanSelector: React.FC<PlanSelectorProps> = ({
  selectedPlan,
  selectedPeriod,
  onPlanChange,
  onPeriodChange,
}) => {
  const { t } = useTranslation();

  const plans: { key: SubscriptionPlanType; label: string; description: string }[] = [
    {
      key: "student",
      label: t("register.student"),
      description: t("register.studentDescription"),
    },
    {
      key: "professional",
      label: t("register.professional"),
      description: t("register.professionalDescription"),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={`text-sm cursor-pointer ${selectedPeriod === "monthly" ? "font-semibold text-gray-900" : "text-gray-400"}`}
          onClick={() => onPeriodChange("monthly")}
        >
          {t("register.monthly")}
        </span>
        <button
          type="button"
          onClick={() => onPeriodChange(selectedPeriod === "monthly" ? "annual" : "monthly")}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            selectedPeriod === "annual" ? "bg-gray-900" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              selectedPeriod === "annual" ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`text-sm cursor-pointer ${selectedPeriod === "annual" ? "font-semibold text-gray-900" : "text-gray-400"}`}
          onClick={() => onPeriodChange("annual")}
        >
          {t("register.annual")}
          <span className="ml-1 text-xs text-green-600 font-medium">{t("register.annualSaving")}</span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-2 gap-3">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.key;
          const price = PRICES[plan.key][selectedPeriod];
          const period = selectedPeriod === "monthly" ? t("register.priceMonthly") : t("register.priceAnnual");

          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => onPlanChange(plan.key)}
              className={`text-left p-4 rounded-lg border-2 transition-colors ${
                isSelected
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-semibold text-gray-900 text-sm">{plan.label}</div>
              <div className="text-xs text-gray-500 mt-1">{plan.description}</div>
              <div className="mt-2">
                <span className="text-xl font-bold text-gray-900">€{price}</span>
                <span className="text-xs text-gray-500">{period}</span>

              </div>
              <div className="mt-2">

                <span className="text-xs text-gray-500">Impuestos incluidos</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
