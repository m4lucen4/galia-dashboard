import { Routes, Route, Navigate } from "react-router-dom";
import { LoginScreen } from "../screens/Login";
import { RecoveryPasswordScreen } from "../screens/RecoveryPassword";
import { Home } from "../screens/Home";
import { Profile } from "../screens/Profile";
import { Settings } from "../screens/Settings";
import { Users } from "../screens/Users";
import { Projects } from "../screens/Projects";

import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { PasswordResetRoute } from "./PasswordResetRoute";
import { PreviewProjects } from "../screens/PreviewProjects";

export const AppRoutes = () => (
  <Routes>
    <Route element={<PublicRoute />}>
      <Route path="/login" element={<LoginScreen />} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route path="/home" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/users" element={<Users />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/preview-projects" element={<PreviewProjects />} />
    </Route>
    <Route element={<PasswordResetRoute />}>
      <Route path="/reset-password" element={<RecoveryPasswordScreen />} />
    </Route>
    <Route path="/" element={<Navigate to="/home" replace />} />
    <Route path="*" element={<Navigate to="/home" replace />} />
  </Routes>
);
