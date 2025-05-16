import { Navigate, Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { RootState, AppDispatch } from "../redux/store";
import { checkAuthState } from "../redux/actions/AuthActions";

interface PublicRouteProps {
  children?: React.ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
  const { authenticated } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(checkAuthState());
  }, [dispatch]);

  if (authenticated && !location.pathname.startsWith("/projects-map")) {
    return <Navigate to="/home" replace />;
  }

  return <>{children || <Outlet />}</>;
};
