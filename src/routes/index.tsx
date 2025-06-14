import { Routes, Route, Navigate } from "react-router-dom";
import { LoginScreen } from "../features/login/screens/Login";
import { RecoveryPasswordScreen } from "../screens/RecoveryPassword";
import { Home } from "../screens/Home";
import { Profile } from "../screens/Profile";
import { Settings } from "../features/settings/screens/Settings";
import { Users } from "../screens/Users";
import { Projects } from "../features/projects/screens/Projects";
import { AdminPanel } from "../features/adminPanel/screens/AdminPanel";

import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { PasswordResetRoute } from "./PasswordResetRoute";
import { ProjectsMap } from "../features/maps/screens/ProjectsMap";
import { AdminRoute } from "./AdminRoute";
import { LinkedInCallback } from "../screens/LinkedInCallback";
import { Privacy } from "../screens/public/Privacy";
import { InstagramCallback } from "../screens/InstagramCallback";
import { PreviewProjects } from "../features/postPreview/screens/PreviewProjects";

export const AppRoutes = () => (
  <Routes>
    <Route element={<PublicRoute />}>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/projects-map" element={<ProjectsMap />} />
      <Route path="/projects-map/:projectId" element={<ProjectsMap />} />
      <Route path="/privacy" element={<Privacy />} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route path="/home" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/preview-projects" element={<PreviewProjects />} />
      <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
      <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
    </Route>
    <Route element={<AdminRoute />}>
      <Route path="/users" element={<Users />} />
      <Route path="/admin-panel" element={<AdminPanel />} />
    </Route>
    <Route element={<PasswordResetRoute />}>
      <Route path="/reset-password" element={<RecoveryPasswordScreen />} />
    </Route>
    <Route path="/" element={<Navigate to="/home" replace />} />
    <Route path="*" element={<Navigate to="/home" replace />} />
  </Routes>
);
