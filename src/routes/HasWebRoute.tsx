import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import { DashboardLayout } from "@/components/shared/navigation/DashboardLayout";

export const HasWebRoute = () => {
  const { authenticated, user } = useSelector((state: RootState) => state.auth);

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.has_web) {
    return <Navigate to="/home" replace />;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};
