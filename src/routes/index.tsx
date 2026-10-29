import { Routes, Route, Navigate } from "react-router-dom";
import { LoginScreen } from "../features/login/screens/Login";
import { RecoveryPasswordScreen } from "../screens/RecoveryPassword";
import { Home } from "../screens/Home";
import { Profile } from "../features/profile/screens/Profile";
import { Settings } from "../features/settings/screens/Settings";
import { Users } from "../features/users/screens/Users";
import { Projects } from "../features/projects/screens/Projects";
import { ProjectsAnalytics } from "../features/projects/screens/ProjectsAnalytics";
import { MyGpts } from "../features/adminPanel/screens/MyGpts";
import { Documentation } from "../features/documentation/screens/Documentation";

import { ProtectedRoute } from "./ProtectedRoute";
import { PasswordResetRoute } from "./PasswordResetRoute";
import { AdminRoute } from "./AdminRoute";
import { AdminWebRoute } from "./AdminWebRoute";
import { HasWebRoute } from "./HasWebRoute";

import { NewWeb } from "@/features/newWeb/screen/NewWeb";
import { ArticlesLoading } from "@/features/newWeb/components/articles/ArticlesLayout";
import { Privacy } from "../screens/public/Privacy";
import { Cookies } from "../screens/public/Cookies";
import { Terms } from "../screens/public/Terms";
import { InstagramCallback } from "../features/settings/screens/InstagramCallback";
import { LinkedInCallback } from "../features/settings/screens/LinkedInCallback";
import { PreviewProjects } from "../features/postPreview/screens/PreviewProjects";
import { NonAuthenticatedRoute } from "./NonAuthenticatedRoute";
import { RegisterScreen } from "../features/register/screens/Register";
import { Multimedia } from "@/features/multimedia/screens/Multimedia";
import { Archive } from "../features/archive/screens/Archive";
import { MyWeb } from "../features/myWeb/screens/MyWeb";
import { lazy, Suspense } from "react";
const Articles = lazy(() => import("@/features/newWeb/screen/Articles").then((module) => ({ default: module.Articles })));
const WikiAdmin = lazy(() => import("@/features/documentation/screens/WikiAdmin").then((module) => ({ default: module.WikiAdmin })));
const Administration = lazy(() => import("@/features/administration/screens/Administration").then((module) => ({ default: module.Administration })));

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<NewWeb />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/cookies" element={<Cookies />} />
    <Route path="/terms" element={<Terms />} />
    <Route element={<NonAuthenticatedRoute />}>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
    </Route>
    <Route element={<AdminRoute layout="sidebar" />}>
      <Route path="/users" element={<Users />} />
      <Route path="/administration" element={<Suspense fallback={<div className="p-8">Cargando administración…</div>}><Administration /></Suspense>} />
      <Route path="/wiki/admin" element={<Suspense fallback={<div className="p-8">Cargando editor…</div>}><WikiAdmin /></Suspense>} />
    </Route>
    <Route path="/articulos" element={<Suspense fallback={<ArticlesLoading />}><Articles /></Suspense>} />
    <Route path="/articulos/:sectionId/:sectionSlug?" element={<Suspense fallback={<ArticlesLoading />}><Articles /></Suspense>} />
    <Route path="/wiki" element={<Documentation />} />
    <Route path="/wiki/:sectionId/:sectionSlug?" element={<Documentation />} />
    <Route element={<ProtectedRoute layout="sidebar" />}>
      <Route path="/home" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/my-gpts" element={<MyGpts />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/projects-analytics" element={<ProjectsAnalytics />} />
      <Route path="/multimedia" element={<Multimedia />} />
      <Route path="/preview-projects" element={<PreviewProjects />} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
      <Route path="/auth/instagram/callback" element={<InstagramCallback />} />
    </Route>
    <Route element={<AdminWebRoute />}>
      <Route path="/archivo" element={<Archive />} />
    </Route>
    <Route element={<HasWebRoute />}>
      <Route path="/my-web" element={<MyWeb />} />
    </Route>
    <Route element={<PasswordResetRoute />}>
      <Route path="/reset-password" element={<RecoveryPasswordScreen />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
