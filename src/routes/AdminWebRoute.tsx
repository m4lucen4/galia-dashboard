import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../redux/store";
import NavbarWeb from "../components/shared/ui/NavbarWeb";

export const AdminWebRoute = () => {
  const { authenticated, user } = useSelector((state: RootState) => state.auth);

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <NavbarWeb />
      <div className="pt-16">
        <Outlet />
      </div>
    </>
  );
};
