import { Navigate, Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { RootState, AppDispatch } from "../redux/store";
import { checkAuthState } from "../redux/actions/AuthActions";
import { LoadingSpinner } from "../components/shared/ui/LoadingSpinner";

import Navbar from "../components/shared/ui/Navbar";
import { DashboardPage } from "@/components/shared/ui/DashboardPage";
import { DashboardLayout } from "@/components/shared/navigation/DashboardLayout";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  layout?: "default" | "sidebar";
}

export const ProtectedRoute = ({ children, layout = "default" }: ProtectedRouteProps) => {
  const { authenticated } = useSelector((state: RootState) => state.auth);
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

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (layout === "sidebar") {
    return <DashboardLayout>{children || <Outlet />}</DashboardLayout>;
  }

  return (
    <>
      <Navbar />
      <DashboardPage>
        {children || <Outlet />}
      </DashboardPage>
    </>
  );
};
