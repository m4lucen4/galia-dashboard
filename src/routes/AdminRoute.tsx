import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import Navbar from "../components/shared/ui/Navbar";
import { DashboardPage } from "@/components/shared/ui/DashboardPage";
import { DashboardLayout } from "@/components/shared/navigation/DashboardLayout";

interface AdminRouteProps {
  children?: React.ReactNode;
  layout?: "default" | "sidebar";
}

export const AdminRoute = ({ children, layout = "default" }: AdminRouteProps) => {
  const { authenticated, user } = useSelector((state: RootState) => state.auth);

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/home" replace />;
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
