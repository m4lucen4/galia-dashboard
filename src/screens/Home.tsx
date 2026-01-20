import { useEffect, useMemo } from "react";
import { useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";

import { useProjectsData } from "@/hooks/useProjectsData";
import { usePreviewProjectsData } from "@/hooks/usePreviewProjectsData";
import { InstagramIcon, LinkedInIcon } from "@/components/icons";

export const Home = () => {
  const userData = useAppSelector((state: RootState) => state.auth.user);
  const { projects, projectsFetchRequest } = useAppSelector(
    (state: RootState) => state.project,
  );
  const { projects: previewProjects } = useAppSelector(
    (state: RootState) => state.previewProject,
  );

  const fetchProjectsData = useProjectsData(userData);
  const fetchPreviewProjectsData = usePreviewProjectsData(userData);

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

  return (
    <div className="container mx-auto p-4">
      {/* TODO: refactor screen with components */}
      <div className="flex justify-between items-center mb-6">
        <p className="mt-1 max-w-2xl text-md text-black">
          Hola, {userData?.first_name}!
        </p>
      </div>

      {/* Mostrar error si existe */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-400 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-700">
              Error al cargar los proyectos. Por favor, intenta recargar la
              página.
            </p>
          </div>
        </div>
      )}

      {/* Cards de estadísticas de proyectos */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total de proyectos */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total de proyectos
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {hasError ? "-" : projectsStats.totalProjects}
                </p>
              </div>
            </div>
          </div>

          {/* Proyectos en borrador */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Proyectos en borrador
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {hasError ? "-" : projectsStats.draftProjects}
                </p>
              </div>
            </div>
          </div>

          {/* Proyectos publicados en guía */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Publicados en guía de arquitectura
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {hasError ? "-" : projectsStats.publishedInGuide}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de estadísticas de publicaciones */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Publicaciones en modo borrador */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Publicaciones en modo borrador
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {publicationsStats.draftPublications}
                </p>
              </div>
            </div>
          </div>

          {/* Publicaciones en Instagram */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center">
              <InstagramIcon className="h-6 w-6 text-pink-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Publicaciones en Instagram
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {publicationsStats.instagramPublications}
                </p>
              </div>
            </div>
          </div>

          {/* Publicaciones en LinkedIn */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center">
              <LinkedInIcon className="h-6 w-6 text-blue-700" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Publicaciones en LinkedIn
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {publicationsStats.linkedinPublications}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
