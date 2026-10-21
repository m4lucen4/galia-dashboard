import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCardIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { fetchSubscription, cancelSubscription, reactivateSubscription, startSubscription, updateMyWeb } from "../../../redux/actions/SubscriptionActions";
import { clearSubscriptionErrors } from "../../../redux/slices/SubscriptionSlice";
import { Alert } from "../../../components/shared/ui/Alert";
import { formatDateToDDMMYYYY } from "../../../helpers";
import { supabase } from "../../../helpers/supabase";
import { PlanSelector } from "../../register/components/PlanSelector";
import type { BillingPeriod } from "@/types";
import { formatMoney } from "@/helpers/subscriptionPricing";

export const SubscriptionInfo = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showReactivateAlert, setShowReactivateAlert] = useState(false);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [newMyWeb, setNewMyWeb] = useState(false);
  const [confirmMyWeb, setConfirmMyWeb] = useState(false);
  const [newPeriod, setNewPeriod] = useState<BillingPeriod>("monthly");

  const { subscription, fetchSubscriptionRequest, cancelSubscriptionRequest, reactivateSubscriptionRequest, startSubscriptionRequest, updateMyWebRequest } =
    useAppSelector((state) => state.subscription);

  useEffect(() => {
    const refresh = () => { dispatch(fetchSubscription()); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [dispatch]);

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;
    await dispatch(cancelSubscription(subscription.stripe_subscription_id));
    setShowCancelAlert(false);
  };

  const handleBillingPortal = async () => {
    setBillingPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch("/api/billing-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ return_url: window.location.href }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setBillingPortalLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;
    await dispatch(reactivateSubscription(subscription.stripe_subscription_id));
    dispatch(clearSubscriptionErrors());
    setShowReactivateAlert(false);
  };

  if (fetchSubscriptionRequest.inProgress) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!subscription && fetchSubscriptionRequest.messages) {
    return <div role="alert" className="space-y-3 text-sm text-red-600">
      <p>{fetchSubscriptionRequest.messages}</p>
      <button type="button" onClick={() => dispatch(fetchSubscription())}>{t("billing.refresh")}</button>
    </div>;
  }

  if (!subscription) {
    const handleStartSubscription = () => {
      dispatch(startSubscription({ plan_type: "professional", billing_period: newPeriod, myweb: newMyWeb }));
    };

    return (
      <div className="space-y-5">
        <p className="text-sm text-gray-500">{t("settings.noSubscription")}</p>
        <PlanSelector
          selectedPeriod={newPeriod}
          myweb={newMyWeb}
          onMyWebChange={setNewMyWeb}
          onPeriodChange={setNewPeriod}
        />
        {startSubscriptionRequest.messages && (
          <p className="text-sm text-red-600">{startSubscriptionRequest.messages}</p>
        )}
        <button
          type="button"
          onClick={handleStartSubscription}
          disabled={startSubscriptionRequest.inProgress}
          className="w-full py-2 px-4 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {startSubscriptionRequest.inProgress ? t("shared.loading") : t("settings.activateSubscription")}
        </button>
      </div>
    );
  }

  const planLabel =
    subscription.plan_type === "student" ? t("register.student") : t("register.professional");

  const isNewCatalog = subscription.catalog_version === "profesional_myweb_v1";
  const price = typeof subscription.amount_excluding_tax === "number"
    ? formatMoney(subscription.amount_excluding_tax, i18n.language, subscription.currency || "EUR") : "";
  const handleMyWebChange = async () => {
    setConfirmMyWeb(false);
    const result = await dispatch(updateMyWeb({
      stripe_subscription_id: subscription.stripe_subscription_id, enabled: !subscription.myweb,
    }));
    if (updateMyWeb.fulfilled.match(result)) {
      await dispatch(fetchSubscription());
      if (result.payload.pending_payment && result.payload.payment_url) window.location.assign(result.payload.payment_url);
    }
  };
  const periodLabel =
    subscription.billing_period === "monthly"
      ? `${t("register.monthly")} (${price})`
      : `${t("register.annual")} (${price})`;

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
        {subscription.current_period_end && !subscription.cancel_at_period_end && (
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

      <button
        type="button"
        onClick={handleBillingPortal}
        disabled={billingPortalLoading}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
      >
        <CreditCardIcon className="h-4 w-4" />
        {billingPortalLoading ? t("shared.loading") : t("settings.managePaymentMethod")}
      </button>

      {isNewCatalog && (
        <div className="space-y-3 rounded-lg border border-gray-200 p-4 text-sm">
          <p className="text-xs text-gray-500">{t("billing.excludingVat")} · {t("billing.vatAtCheckout")}</p>
          <p className="font-semibold">{t("billing.myWebStatus", { status: t(subscription.myweb ? "billing.included" : "billing.notIncluded") })}</p>
          {subscription.myweb_cancel_at ? <p>{t("billing.removalScheduled", { date: formatDateToDDMMYYYY(subscription.myweb_cancel_at) })}</p> : (
            subscription.status === "active" && !subscription.cancel_at_period_end && !subscription.myweb_payment_url && <button
              type="button" disabled={updateMyWebRequest.inProgress} onClick={() => setConfirmMyWeb(true)}
              className="rounded-lg border border-gray-900 px-4 py-2 disabled:opacity-50">
              {t(subscription.myweb ? "billing.removeMyWeb" : "billing.addMyWeb")}
            </button>
          )}
          {subscription.myweb_payment_url && <a className="block underline" href={subscription.myweb_payment_url}>{t("billing.completePayment")}</a>}
          {updateMyWebRequest.messages && <p role="alert" className="text-red-600">{updateMyWebRequest.messages}</p>}
          {confirmMyWeb && <Alert
            title={t(subscription.myweb ? "billing.removeMyWeb" : "billing.addMyWeb")}
            description={t(subscription.myweb ? "billing.removeConfirmation" : "billing.addConfirmation")}
            onAccept={handleMyWebChange} onCancel={() => setConfirmMyWeb(false)}
            disabledConfirmButton={updateMyWebRequest.inProgress}
          />}
        </div>
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
          onClick={() => setShowReactivateAlert(true)}
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

      {showReactivateAlert && (
        <Alert
          title={t("settings.reactivateSubscription")}
          description={t("settings.reactivateSubscriptionDescription")}
          icon={ArrowPathIcon}
          iconClassName="size-6 text-white"
          onAccept={handleReactivateSubscription}
          onCancel={() => setShowReactivateAlert(false)}
          disabledConfirmButton={reactivateSubscriptionRequest.inProgress}
        />
      )}
    </div>
  );
};
