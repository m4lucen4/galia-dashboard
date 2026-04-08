import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCardIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { fetchSubscription, cancelSubscription, reactivateSubscription } from "../../../redux/actions/SubscriptionActions";
import { Alert } from "../../../components/shared/ui/Alert";
import { formatDateToDDMMYYYY } from "../../../helpers";

export const SubscriptionInfo = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [showCancelAlert, setShowCancelAlert] = useState(false);

  const { subscription, fetchSubscriptionRequest, cancelSubscriptionRequest, reactivateSubscriptionRequest } =
    useAppSelector((state) => state.subscription);

  useEffect(() => {
    dispatch(fetchSubscription());
  }, [dispatch]);

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;
    await dispatch(cancelSubscription(subscription.stripe_subscription_id));
    setShowCancelAlert(false);
  };

  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;
    await dispatch(reactivateSubscription(subscription.stripe_subscription_id));
  };

  if (fetchSubscriptionRequest.inProgress) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <p className="text-sm text-gray-500 py-4">{t("settings.noSubscription")}</p>
    );
  }

  const planLabel =
    subscription.plan_type === "student" ? t("register.student") : t("register.professional");
  const periodLabel =
    subscription.billing_period === "monthly" ? t("register.monthly") : t("register.annual");

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-600",
    past_due: "bg-red-100 text-red-800",
    incomplete: "bg-yellow-100 text-yellow-800",
  };

  const statusLabels: Record<string, string> = {
    active: t("settings.statusActive"),
    cancelled: t("settings.statusCancelled"),
    past_due: t("settings.statusPastDue"),
    incomplete: t("settings.statusIncomplete"),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t("settings.currentPlan")}</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{planLabel}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t("settings.billingPeriod")}</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{periodLabel}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{t("settings.status")}</p>
          <span
            className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[subscription.status] || "bg-gray-100 text-gray-600"}`}
          >
            {statusLabels[subscription.status] || subscription.status}
          </span>
        </div>
        {subscription.current_period_end && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {subscription.status === "cancelled" ? t("settings.activeUntil") : t("settings.nextRenewal")}
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {formatDateToDDMMYYYY(subscription.current_period_end)}
            </p>
          </div>
        )}
      </div>

      {subscription.status === "active" && !subscription.cancel_at_period_end && (
        <button
          type="button"
          onClick={() => setShowCancelAlert(true)}
          disabled={cancelSubscriptionRequest.inProgress}
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
        >
          <CreditCardIcon className="h-4 w-4" />
          {t("settings.cancelSubscription")}
        </button>
      )}

      {(subscription.cancel_at_period_end || cancelSubscriptionRequest.ok) && subscription.current_period_end && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
          {t("settings.subscriptionCancelledDescription", {
            date: formatDateToDDMMYYYY(subscription.current_period_end),
          })}
        </div>
      )}

      {subscription.cancel_at_period_end && (
        <button
          type="button"
          onClick={handleReactivateSubscription}
          disabled={reactivateSubscriptionRequest.inProgress}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {t("settings.reactivateSubscription")}
        </button>
      )}

      {showCancelAlert && (
        <Alert
          title={t("settings.cancelSubscription")}
          description={t("settings.cancelSubscriptionDescription")}
          icon={CreditCardIcon}
          iconClassName="size-6 text-white"
          onAccept={handleCancelSubscription}
          onCancel={() => setShowCancelAlert(false)}
          disabledConfirmButton={cancelSubscriptionRequest.inProgress}
        />
      )}
    </div>
  );
};
