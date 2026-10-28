import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import Navbar from "../components/shared/ui/Navbar";
import { DashboardPage } from "@/components/shared/ui/DashboardPage";

export const HasWebRoute = () => {
  const { authenticated, user } = useSelector((state: RootState) => state.auth);

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.has_web) {
    return <Navigate to="/home" replace />;
  }

  return (
    <>
      <Navbar />
      <DashboardPage>
        <Outlet />
      </DashboardPage>
    </>
  );
};
