import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCardIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { fetchSubscription, cancelSubscription, reactivateSubscription, startSubscription, updateMyWeb } from "../../../redux/actions/SubscriptionActions";
import { clearSubscriptionErrors } from "../../../redux/slices/SubscriptionSlice";
import { Alert } from "../../../components/shared/ui/Alert";
import { formatDateToDDMMYYYY } from "../../../helpers";
import { supabase } from "../../../helpers/supabase";
import { RegistrationMemberships } from "@/features/register/components/RegistrationMemberships";
import { PillButton } from "@/components/shared/ui/PillButton";
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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#010000]" />
      </div>
    );
  }

  if (!subscription && fetchSubscriptionRequest.messages) {
    return <div role="alert" className="space-y-3 text-sm text-[#9f231b]">
      <p>{fetchSubscriptionRequest.messages}</p>
      <PillButton type="button" onClick={() => dispatch(fetchSubscription())}>{t("billing.refresh")}</PillButton>
    </div>;
  }

  if (!subscription) {
    const handleStartSubscription = () => {
      dispatch(startSubscription({ plan_type: "professional", billing_period: newPeriod, myweb: newMyWeb }));
    };

    return (
      <div className="space-y-5">
        <p className="text-sm text-[#010000]/65">{t("settings.noSubscription")}</p>
        <RegistrationMemberships
          selectedPeriod={newPeriod}
          myweb={newMyWeb}
          onMyWebChange={setNewMyWeb}
          onPeriodChange={setNewPeriod}
        />
        {startSubscriptionRequest.messages && (
          <p className="text-sm text-[#9f231b]">{startSubscriptionRequest.messages}</p>
        )}
        <PillButton
          type="button"
          onClick={handleStartSubscription}
          disabled={startSubscriptionRequest.inProgress}
          className="w-full"
        >
          {startSubscriptionRequest.inProgress ? t("shared.loading") : t("settings.activateSubscription")}
        </PillButton>
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
    active: "bg-[#d8e4d6] text-[#365640]",
    cancelled: "bg-[#010000]/5 text-[#010000]/70",
    past_due: "bg-[#ff522a]/15 text-[#9f231b]",
    incomplete: "bg-[#fbea71] text-[#010000]",
  };

  const statusLabels: Record<string, string> = {
    active: t("settings.statusActive"),
    cancelled: t("settings.statusCancelled"),
    past_due: t("settings.statusPastDue"),
    incomplete: t("settings.statusIncomplete"),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 border-b border-[#010000]/15 pb-6 sm:grid-cols-2">
        <div>
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#010000]/65 uppercase tracking-wide">{t("settings.currentPlan")}</p>
          <p className="text-2xl font-medium tracking-[-0.03em] text-[#010000] mt-2">{planLabel}</p>
        </div>
        <div>
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#010000]/65 uppercase tracking-wide">{t("settings.billingPeriod")}</p>
          <p className="text-sm font-semibold text-[#010000] mt-1">{periodLabel}</p>
        </div>
        <div>
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#010000]/65 uppercase tracking-wide">{t("settings.status")}</p>
          <span
            className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[subscription.status] || "bg-[#010000]/5 text-[#010000]/70"}`}
          >
            {statusLabels[subscription.status] || subscription.status}
          </span>
        </div>
        {subscription.current_period_end && !subscription.cancel_at_period_end && (
          <div>
            <p className="font-['Geist_Mono',monospace] text-[11px] text-[#010000]/65 uppercase tracking-wide">
              {subscription.status === "cancelled" ? t("settings.activeUntil") : t("settings.nextRenewal")}
            </p>
            <p className="text-sm font-semibold text-[#010000] mt-1">
              {formatDateToDDMMYYYY(subscription.current_period_end)}
            </p>
          </div>
        )}
      </div>

      {subscription.status === "active" && !subscription.cancel_at_period_end && (
        <PillButton
          type="button"
          onClick={() => setShowCancelAlert(true)}
          disabled={cancelSubscriptionRequest.inProgress}
          variant="outline"
          className="mr-3 border-[#9f231b]/40 text-[#9f231b]"
        >
          <CreditCardIcon className="h-4 w-4" />
          {t("settings.cancelSubscription")}
        </PillButton>
      )}

      <PillButton
        type="button"
        onClick={handleBillingPortal}
        disabled={billingPortalLoading}
        variant="outline"
      >
        <CreditCardIcon className="h-4 w-4" />
        {billingPortalLoading ? t("shared.loading") : t("settings.managePaymentMethod")}
      </PillButton>

      {isNewCatalog && (
        <div className="space-y-3 rounded-3xl border border-[#010000]/20 p-4 text-sm">
          <p className="text-xs text-[#010000]/65">{t("billing.excludingVat")} · {t("billing.vatAtCheckout")}</p>
          <p className="font-semibold">{t("billing.myWebStatus", { status: t(subscription.myweb ? "billing.included" : "billing.notIncluded") })}</p>
          {subscription.myweb_cancel_at ? <p>{t("billing.removalScheduled", { date: formatDateToDDMMYYYY(subscription.myweb_cancel_at) })}</p> : (
            subscription.status === "active" && !subscription.cancel_at_period_end && !subscription.myweb_payment_url && <PillButton
              type="button" disabled={updateMyWebRequest.inProgress} onClick={() => setConfirmMyWeb(true)}
              variant="outline">
              {t(subscription.myweb ? "billing.removeMyWeb" : "billing.addMyWeb")}
            </PillButton>
          )}
          {subscription.myweb_payment_url && <a className="block underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" href={subscription.myweb_payment_url}>{t("billing.completePayment")}</a>}
          {updateMyWebRequest.messages && <p role="alert" className="text-[#9f231b]">{updateMyWebRequest.messages}</p>}
          {confirmMyWeb && <Alert
            title={t(subscription.myweb ? "billing.removeMyWeb" : "billing.addMyWeb")}
            description={t(subscription.myweb ? "billing.removeConfirmation" : "billing.addConfirmation")}
            onAccept={handleMyWebChange} onCancel={() => setConfirmMyWeb(false)}
            disabledConfirmButton={updateMyWebRequest.inProgress}
          />}
        </div>
      )}

      {(subscription.cancel_at_period_end || cancelSubscriptionRequest.ok) && subscription.current_period_end && (
        <div className="rounded-2xl bg-[#fbea71]/50 border border-[#010000]/15 p-4 text-sm text-[#010000]">
          {t("settings.subscriptionCancelledDescription", {
            date: formatDateToDDMMYYYY(subscription.current_period_end),
          })}
        </div>
      )}

      {subscription.cancel_at_period_end && (
        <PillButton
          type="button"
          onClick={() => setShowReactivateAlert(true)}
          disabled={reactivateSubscriptionRequest.inProgress}
          variant="outline"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {t("settings.reactivateSubscription")}
        </PillButton>
      )}

      {showCancelAlert && (
        <Alert
          title={t("settings.cancelSubscription")}
          description={t("settings.cancelSubscriptionDescription")}
          icon={CreditCardIcon}
          iconClassName="size-6 text-[#010000]"
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
          iconClassName="size-6 text-[#010000]"
          onAccept={handleReactivateSubscription}
          onCancel={() => setShowReactivateAlert(false)}
          disabledConfirmButton={reactivateSubscriptionRequest.inProgress}
        />
      )}
    </div>
  );
};
