import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { LoadingSpinner } from "@/components/shared/ui/LoadingSpinner";
import { checkAuthState } from "../redux/actions/AuthActions";

interface NonAuthenticatedRouteProps {
  children?: React.ReactNode;
}

export const NonAuthenticatedRoute = ({
  children,
}: NonAuthenticatedRouteProps) => {
  const { authenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      await dispatch(checkAuthState());
      setIsChecking(false);
    };

    void checkAuth();
  }, [dispatch]);

  if (isChecking) {
    return <LoadingSpinner fullPage />;
  }

  if (authenticated) {
    return <Navigate to="/home" replace />;
  }

  return <>{children || <Outlet />}</>;
};
