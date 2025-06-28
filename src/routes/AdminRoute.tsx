import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import Navbar from "../components/shared/ui/Navbar";
import Footer from "../components/shared/ui/Footer";

interface AdminRouteProps {
  children?: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { authenticated, user } = useSelector((state: RootState) => state.auth);

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto mt-6 px-4">
        {children || <Outlet />}
      </div>
      <Footer />
    </>
  );
};
