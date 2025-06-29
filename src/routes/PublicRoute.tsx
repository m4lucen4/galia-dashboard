import { Outlet } from "react-router-dom";
import Navbar from "../components/shared/ui/Navbar";
import Footer from "../components/shared/ui/Footer";

interface PublicRouteProps {
  children?: React.ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
  return (
    <>
      <Navbar />
      {children || <Outlet />}
      <Footer />
    </>
  );
};
