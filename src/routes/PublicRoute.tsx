import { Outlet } from "react-router-dom";
import Footer from "../components/shared/ui/Footer";

interface PublicRouteProps {
  children?: React.ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
  return (
    <>
      {children || <Outlet />}
      <Footer />
    </>
  );
};
