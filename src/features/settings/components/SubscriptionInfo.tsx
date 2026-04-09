import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CreditCardIcon, ArrowPathIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { fetchSubscription, cancelSubscription, reactivateSubscription, startSubscription, uploadStudentCard } from "../../../redux/actions/SubscriptionActions";
import { clearSubscriptionErrors } from "../../../redux/slices/SubscriptionSlice";
import { Alert } from "../../../components/shared/ui/Alert";
import { formatDateToDDMMYYYY } from "../../../helpers";
import { supabase } from "../../../helpers/supabase";
import { PlanSelector } from "../../register/components/PlanSelector";
import { StudentCardUpload } from "../../register/components/StudentCardUpload";
import { SubscriptionPlanType, BillingPeriod } from "../../../types";

export const SubscriptionInfo = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [showReactivateAlert, setShowReactivateAlert] = useState(false);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [newPlan, setNewPlan] = useState<SubscriptionPlanType>("professional");
  const [newPeriod, setNewPeriod] = useState<BillingPeriod>("monthly");

  const { subscription, fetchSubscriptionRequest, cancelSubscriptionRequest, reactivateSubscriptionRequest, startSubscriptionRequest, uploadStudentCardRequest } =
    useAppSelector((state) => state.subscription);

  const [pendingStudentCard, setPendingStudentCard] = useState<File | undefined>(undefined);
  const [pendingStudentCardError, setPendingStudentCardError] = useState("");

  useEffect(() => {
    dispatch(fetchSubscription());
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

  if (!subscription) {
    const handleStartSubscription = () => {
      dispatch(startSubscription({ plan_type: newPlan, billing_period: newPeriod }));
    };

    return (
      <div className="space-y-5">
        <p className="text-sm text-gray-500">{t("settings.noSubscription")}</p>
        <PlanSelector
          selectedPlan={newPlan}
          selectedPeriod={newPeriod}
          onPlanChange={setNewPlan}
          onPeriodChange={setNewPeriod}
        />
        {newPlan === "student" && (
          <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <InformationCircleIcon className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
            <p className="text-sm text-blue-700">{t("register.studentCardNotice")}</p>
          </div>
        )}
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

  const priceMap: Record<string, Record<string, string>> = {
    student:      { monthly: "6,05 €",   annual: "254,10 €" },
    professional: { monthly: "30,25 €",  annual: "50,82 €" },
  };
  const price = priceMap[subscription.plan_type]?.[subscription.billing_period] ?? "";
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

      {subscription.plan_type === "student" && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{t("settings.studentCardSection")}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t("settings.studentCardSectionDescription")}</p>
          </div>
          {subscription.student_card_url ? (
            <div className="flex items-center gap-2">
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                {t("settings.studentCardPending")}
              </span>
              <a
                href={subscription.student_card_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                {t("settings.studentCard")}
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <StudentCardUpload
                file={pendingStudentCard}
                onFileChange={(f) => { setPendingStudentCard(f); setPendingStudentCardError(""); }}
                error={pendingStudentCardError}
              />
              {uploadStudentCardRequest.ok && (
                <p className="text-sm text-green-600">{t("settings.studentCardUploaded")}</p>
              )}
              {uploadStudentCardRequest.messages && (
                <p className="text-sm text-red-600">{uploadStudentCardRequest.messages}</p>
              )}
              <button
                type="button"
                disabled={!pendingStudentCard || uploadStudentCardRequest.inProgress}
                onClick={() => {
                  if (!pendingStudentCard) { setPendingStudentCardError(t("register.studentCardRequired")); return; }
                  dispatch(uploadStudentCard(pendingStudentCard));
                }}
                className="text-sm font-medium text-gray-900 underline hover:text-gray-600 disabled:opacity-40 disabled:no-underline"
              >
                {uploadStudentCardRequest.inProgress ? t("shared.loading") : t("settings.uploadStudentCard")}
              </button>
            </div>
          )}
        </div>
      )}

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
