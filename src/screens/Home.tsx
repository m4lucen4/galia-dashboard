import { useEffect, useMemo } from "react";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { RootState } from "../redux/store";

import { useProjectsData } from "@/hooks/useProjectsData";
import { usePreviewProjectsData } from "@/hooks/usePreviewProjectsData";
import { InstagramIcon, LinkedInIcon } from "@/components/icons";
import { fetchSubscription } from "../redux/actions/SubscriptionActions";
import { FolderOpenIcon, PencilSquareIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { HomeStatsSection } from "@/features/home/components/HomeStatsSection";
import { HomeNotices } from "@/features/home/components/HomeNotices";
import { useHasValidSubscription } from "../hooks/useHasValidSubscription";

const SUBSCRIPTION_ROLES = new Set(["student", "customer", "publisher"]);

export const Home = () => {
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state: RootState) => state.auth.user);
  const { projects, projectsFetchRequest } = useAppSelector(
    (state: RootState) => state.project,
  );
  const { projects: previewProjects } = useAppSelector(
    (state: RootState) => state.previewProject,
  );
  const { fetchSubscriptionRequest } = useAppSelector(
    (state: RootState) => state.subscription,
  );

  const fetchProjectsData = useProjectsData(userData);
  const fetchPreviewProjectsData = usePreviewProjectsData(userData);

  const needsSubscriptionCheck = SUBSCRIPTION_ROLES.has(userData?.role ?? "");
  const hasValidSubscription = useHasValidSubscription();

  const showSubscriptionBanner =
    needsSubscriptionCheck &&
    (userData?.active === false ||
      (fetchSubscriptionRequest.ok && !hasValidSubscription));

  // Verificar si hay error
  const hasError =
    projectsFetchRequest.messages.length > 0 && !projectsFetchRequest.ok;

  // Calcular estadísticas de proyectos
  const projectsStats = useMemo(() => {
    if (!projects || !Array.isArray(projects) || hasError) {
      return {
        totalProjects: 0,
        draftProjects: 0,
        publishedInGuide: 0,
      };
    }

    const totalProjects = projects.length;
    const draftProjects = projects.filter(
      (project) => project.state === "draft",
    ).length;
    const publishedInGuide = projects.filter(
      (project) => project.showMap === true,
    ).length;

    return {
      totalProjects,
      draftProjects,
      publishedInGuide,
    };
  }, [projects, hasError]);

  // Calcular estadísticas de publicaciones
  const publicationsStats = useMemo(() => {
    if (!previewProjects || !Array.isArray(previewProjects)) {
      return {
        draftPublications: 0,
        instagramPublications: 0,
        linkedinPublications: 0,
      };
    }

    const draftPublications = previewProjects.filter(
      (publication) => publication.state === "preview",
    ).length;

    const instagramPublications = previewProjects.filter(
      (publication) =>
        publication.state === "published" &&
        publication.instagramResult === "true",
    ).length;

    const linkedinPublications = previewProjects.filter(
      (publication) =>
        publication.state === "published" &&
        publication.linkedlnResult === "true",
    ).length;

    return {
      draftPublications,
      instagramPublications,
      linkedinPublications,
    };
  }, [previewProjects]);

  useEffect(() => {
    fetchProjectsData();
    fetchPreviewProjectsData();
  }, [fetchProjectsData, fetchPreviewProjectsData]);

  useEffect(() => {
    if (needsSubscriptionCheck) {
      dispatch(fetchSubscription());
    }
  }, [dispatch, needsSubscriptionCheck]);

  return (
    <div className="space-y-10">
      <header className="space-y-3 border-b border-[#010000]/15 pb-8">
        <p className="font-['Geist_Mono',monospace] text-xs tracking-widest uppercase">Tu espacio de trabajo</p>
        <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">Hola, {userData?.first_name}!</h1>
        <p className="text-base text-[#010000]/65">Así van tus proyectos y publicaciones.</p>
      </header>
      <HomeNotices hasError={hasError} showSubscriptionBanner={showSubscriptionBanner} />
      <HomeStatsSection title="Tus proyectos" description="Una mirada a lo que estás creando." items={[
        { label: "Total de proyectos", value: hasError ? "-" : projectsStats.totalProjects, icon: FolderOpenIcon, tone: "yellow" },
        { label: "Proyectos en borrador", value: hasError ? "-" : projectsStats.draftProjects, icon: PencilSquareIcon, tone: "mint" },
        { label: "Publicados en guía de arquitectura", value: hasError ? "-" : projectsStats.publishedInGuide, icon: MapPinIcon, tone: "violet" },
      ]} />
      <HomeStatsSection title="Tus publicaciones" description="El contenido que da visibilidad a tu estudio." items={[
        { label: "Publicaciones en modo borrador", value: publicationsStats.draftPublications, icon: PencilSquareIcon, tone: "mint" },
        { label: "Publicaciones en Instagram", value: publicationsStats.instagramPublications, icon: InstagramIcon, tone: "violet" },
        { label: "Publicaciones en LinkedIn", value: publicationsStats.linkedinPublications, icon: LinkedInIcon, tone: "yellow" },
      ]} />
    </div>
  );
};
