import { useMemo } from "react";
import { useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";

const SUBSCRIPTION_ROLES = ["student", "customer", "publisher"];

export const useHasValidSubscription = () => {
  const userData = useAppSelector((state: RootState) => state.auth.user);
  const { subscription } = useAppSelector((state: RootState) => state.subscription);

  return useMemo(() => {
    if (!SUBSCRIPTION_ROLES.includes(userData?.role ?? "")) return true;
    if (!subscription) return false;
    const notExpired =
      !subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date();
    return (
      userData?.active === true &&
      subscription.status === "active" &&
      notExpired
    );
  }, [userData?.role, userData?.active, subscription]);
};
