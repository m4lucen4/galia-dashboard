import { Outlet } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { AppDispatch } from "../redux/store";
import { checkAuthState } from "../redux/actions/AuthActions";
import { LoadingSpinner } from "../components/shared/ui/LoadingSpinner";

interface PasswordResetRouteProps {
  children?: React.ReactNode;
}

export const PasswordResetRoute = ({ children }: PasswordResetRouteProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      await dispatch(checkAuthState());
      setIsChecking(false);
    };

    checkAuth();
  }, [dispatch]);

  if (isChecking) {
    return <LoadingSpinner fullPage />;
  }

  return <>{children || <Outlet />}</>;
};
