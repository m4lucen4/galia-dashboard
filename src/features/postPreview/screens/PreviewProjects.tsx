import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  CalendarDaysIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { usePreviewProjectsData } from "../../../hooks/usePreviewProjectsData";
import { useAlertManager } from "../../../hooks/useAlertManager";
import { useIterationRealtime } from "../../../hooks/useIterationRealtime";
import {
  InstagramPageInfo,
  LinkedInPageInfo,
  PreviewProjectDataProps,
  SocialNetworksCheck,
} from "../../../types";
import { Drawer } from "../../../components/shared/ui/Drawer";
import InstagramPost from "../components/InstagramPost";
import LinkedInPost from "../components//LinkedinPost";
import {
  fetchPreviewProjectById,
  updateProjectPublishing,
  deletePreviewProject,
  resetProjectToPreview,
} from "../../../redux/actions/PreviewProjectActions";
import { clearSelectedProject } from "../../../redux/slices/PreviewProjectSlice";
import { fetchUserByUid } from "../../../redux/actions/UserActions";
import { Alert } from "../../../components/shared/ui/Alert";
import { ConfigPublish } from "../components/configPublish";
import { CardsList } from "../components/cardList";
import { CalendarView } from "../components/calendarView";
import { PreviewProjectForm } from "../../../components/previewProjects/PreviewProjectForm";
import { Filters } from "../components/Filters";
import { WorkingInProgress } from "../../../components/shared/ui/WorkingInProgress";
import { LoadingSpinner } from "../../../components/shared/ui/LoadingSpinner";
import { DashboardPage } from "@/components/shared/ui/DashboardPage";

export const PreviewProjects = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { openAlert, closeAlert, isAlertOpen, getSelectedProject } =
    useAlertManager();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [seeInstagram, setSeeInstagram] = useState(false);
  const [seeLinkedln, setSeeLinkedln] = useState(false);
  const [seeEditPreview, setEditSeePreview] = useState(false);
  const [isReadOnlyPreview, setIsReadOnlyPreview] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [publishDate, setPublishDate] = useState<string>("");
  const [hasDateValidationError, setHasDateValidationError] = useState(false);
  const [publishNow, setPublishNow] = useState(false);
  const [socialNetworks, setSocialNetworks] = useState<SocialNetworksCheck>({
    instagram: false,
    linkedln: false,
  });
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">(
    "grid",
  );
  const [itemsPerPage, setItemsPerPage] = useState<number>(6);
  const [isIterating, setIsIterating] = useState<boolean>(false);
  const [iteratingProjectId, setIteratingProjectId] = useState<string | null>(
    null,
  );
  const [showSuccessAlert, setShowSuccessAlert] = useState<boolean>(false);

  const user = useAppSelector((state: RootState) => state.auth.user);
  const { userData } = useAppSelector((state: RootState) => state.user);
  const {
    projects,
    project,
    previewProjectUpdateRequest,
    previewProjectFetchByIdRequest,
  } = useAppSelector((state: RootState) => state.previewProject);

  const filteredProjects = projects.filter((project) => {
    if (selectedFilter === "all") return true;
    return project.state === selectedFilter;
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleToggleMenu = (projectId: string) => {
    if (openMenuId === projectId) {
      setOpenMenuId(null);
    } else {
      setOpenMenuId(projectId);
    }
  };

  const handleEditPreview = (project: PreviewProjectDataProps) => {
    dispatch(clearSelectedProject());
    dispatch(fetchPreviewProjectById(project.id));
    setIsReadOnlyPreview(false);
    setEditSeePreview(true);
    setDrawerOpen(true);
    setOpenMenuId(null);
  };

  const handleViewProjectDetails = (project: PreviewProjectDataProps) => {
    dispatch(clearSelectedProject());
    dispatch(fetchPreviewProjectById(project.id));
    setIsReadOnlyPreview(project.state !== "preview");
    setEditSeePreview(true);
    setDrawerOpen(true);
    setOpenMenuId(null);
  };

  const handleDeletePreview = (project: PreviewProjectDataProps) => {
    openAlert("delete", project);
    setOpenMenuId(null);
  };

  const handleConfirmDelete = () => {
    const selectedProject = getSelectedProject();
    if (selectedProject) {
      dispatch(deletePreviewProject(selectedProject.id))
        .unwrap()
        .then(() => {
          closeAlert();
          fetchPreviewProjectsData();
        });
    }
  };

  const handlePublishAgain = (project: PreviewProjectDataProps) => {
    openAlert("publishAgain", project);
    setOpenMenuId(null);
  };

  const handleConfirmPublishAgain = () => {
    const selectedProject = getSelectedProject();
    if (selectedProject) {
      dispatch(resetProjectToPreview(selectedProject.id.toString()))
        .unwrap()
        .then(() => {
          closeAlert();
          fetchPreviewProjectsData();
        });
    }
  };

  const fetchPreviewProjectsData = usePreviewProjectsData(user);

  // Listen for iteration completion via realtime updates
  const { isCompleted: isIterationCompleted } = useIterationRealtime(
    iteratingProjectId,
    isIterating,
  );

  // Handle iteration completion
  useEffect(() => {
    if (isIterationCompleted && isIterating) {
      // Use setTimeout to avoid calling setState synchronously within an effect
      setTimeout(() => {
        setIsIterating(false);
        setIteratingProjectId(null);
        setShowSuccessAlert(true);
        fetchPreviewProjectsData();
      }, 0);
    }
  }, [isIterationCompleted, isIterating, fetchPreviewProjectsData]);

  const handleOpenInstagram = (project: PreviewProjectDataProps) => {
    dispatch(clearSelectedProject());
    dispatch(fetchPreviewProjectById(project.id));
    setSeeInstagram(true);
    setDrawerOpen(true);
  };

  const handleOpenLinkedln = (project: PreviewProjectDataProps) => {
    dispatch(clearSelectedProject());
    dispatch(fetchPreviewProjectById(project.id));
    setSeeLinkedln(true);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setSeeInstagram(false);
    setSeeLinkedln(false);
    setEditSeePreview(false);
    setIsReadOnlyPreview(false);
    setDrawerOpen(false);
  };

  const handleSavePreviewProject = () => {
    // Don't close drawer on save - only close when iterating
    fetchPreviewProjectsData();
  };

  const handleIterateStart = () => {
    if (!project) return;

    // Close drawer and show full-screen loading
    setDrawerOpen(false);
    setEditSeePreview(false);
    setIsIterating(true);
    setIteratingProjectId(project.id);

    // Safety timeout (3 minutes) in case realtime fails
    setTimeout(
      () => {
        if (isIterating) {
          setIsIterating(false);
          setIteratingProjectId(null);
          setShowSuccessAlert(true);
          fetchPreviewProjectsData();
        }
      },
      3 * 60 * 1000,
    ); // 3 minutes
  };

  const getDrawerTitle = () => {
    if (seeInstagram) return t("previewProjects.instagramPreview");
    if (seeLinkedln) return t("previewProjects.linkedlnPreview");
    if (seeEditPreview && isReadOnlyPreview)
      return t("previewProjects.viewPreviewProject");
    if (seeEditPreview) return t("previewProjects.editPreviewProject");
    return t("previewProjects.previewProject");
  };

  const handleOpenPublishConfig = (project: PreviewProjectDataProps) => {
    if (project.publishDate) {
      // Preserve the full timestampz format for the dateTime input
      // Format: "2025-06-10 00:00:00+00"
      setPublishDate(project.publishDate);
    } else {
      setPublishDate("");
    }

    // Reset publishNow when opening modal
    setPublishNow(false);

    setSocialNetworks({
      instagram: project.checkSocialNetworks?.instagram || false,
      linkedln: project.checkSocialNetworks?.linkedln || false,
    });

    openAlert("publishConfig", project);
  };

  const handleSocialNetworkChange = (
    network: "instagram" | "linkedln",
    pageInfo?: LinkedInPageInfo | InstagramPageInfo,
  ) => {
    if (network === "instagram") {
      if (pageInfo) {
        setSocialNetworks((prev) => ({
          ...prev,
          instagram: pageInfo as InstagramPageInfo,
        }));
      } else {
        setSocialNetworks((prev) => ({
          ...prev,
          instagram: false,
        }));
      }
    } else {
      if (pageInfo) {
        setSocialNetworks((prev) => ({
          ...prev,
          linkedln: pageInfo as LinkedInPageInfo,
        }));
      } else {
        setSocialNetworks((prev) => ({
          ...prev,
          linkedln: false,
        }));
      }
    }
  };

  const handlePublishProject = () => {
    const selectedProject = getSelectedProject();
    if (selectedProject) {
      dispatch(
        updateProjectPublishing({
          projectId: selectedProject.id,
          publishDate,
          checkSocialNetworks: socialNetworks,
          publishNow,
        }),
      )
        .unwrap()
        .then(() => {
          closeAlert();
          fetchPreviewProjectsData();
        });
    }
  };

  useEffect(() => {
    fetchPreviewProjectsData();
    if (user) {
      dispatch(fetchUserByUid(user.uid));
    }
  }, [dispatch, fetchPreviewProjectsData, user]);

  if (!projects.length) {
    return (
      <DashboardPage className="font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]">
        <div className="rounded-[28px] border border-[#010000]/15 bg-white/50 px-6 py-16 text-center text-[#010000]/65">
          {t("previewProjects.noProjects")}
        </div>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage className="space-y-8 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#010000]/15 pb-8">
        <div className="min-w-0 space-y-3">
          <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] sm:text-5xl">
            {t("previewProjects.title")}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-[#010000]/65">
            {t("previewProjects.description")}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-5">
        <Filters
          projects={projects}
          selectedFilter={selectedFilter}
          onFilterChange={handleFilterChange}
        />
        <div className="hidden shrink-0 items-center gap-1 rounded-full border border-[#010000]/20 bg-white/50 p-1 md:flex">
          <button
            onClick={() => setViewMode("grid")}
            aria-pressed={viewMode === "grid"}
            className={`rounded-full p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] ${
              viewMode === "grid"
                ? "bg-[#010000] text-[#d8e4d6]"
                : "text-[#010000]/65 hover:bg-[#d8e4d6] hover:text-[#010000]"
            }`}
            title="Vista de cuadrícula"
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            className={`rounded-full p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] ${
              viewMode === "list"
                ? "bg-[#010000] text-[#d8e4d6]"
                : "text-[#010000]/65 hover:bg-[#d8e4d6] hover:text-[#010000]"
            }`}
            title="Vista de lista"
          >
            <ListBulletIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            aria-pressed={viewMode === "calendar"}
            className={`rounded-full p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000] ${
              viewMode === "calendar"
                ? "bg-[#010000] text-[#d8e4d6]"
                : "text-[#010000]/65 hover:bg-[#d8e4d6] hover:text-[#010000]"
            }`}
            title="Vista de calendario"
          >
            <CalendarDaysIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Drawer
        variant="dashboard"
        closeLabel={t("users.closeForm")}
        title={getDrawerTitle()}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
      >
        {(seeInstagram || seeLinkedln || seeEditPreview) &&
          !project &&
          previewProjectFetchByIdRequest.inProgress && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="large" color="primary" />
            </div>
          )}
        {seeInstagram && project && userData && (
          <InstagramPost key={project.id} project={project} user={userData} />
        )}
        {seeLinkedln && project && userData && (
          <LinkedInPost key={project.id} project={project} user={userData} />
        )}
        {seeEditPreview && project && (
          <PreviewProjectForm
            key={project.id}
            project={project}
            onSave={handleSavePreviewProject}
            onIterateStart={handleIterateStart}
            loading={previewProjectUpdateRequest.inProgress}
            readOnly={isReadOnlyPreview}
          />
        )}
      </Drawer>

      {viewMode === "calendar" ? (
        <CalendarView
          projects={filteredProjects}
          onSelectProject={handleViewProjectDetails}
        />
      ) : (
        <CardsList
          projects={filteredProjects}
          openMenuId={openMenuId}
          currentPage={currentPage}
          viewMode={viewMode}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          handleToggleMenu={handleToggleMenu}
          handleEditPreview={handleEditPreview}
          handleDeletePreview={handleDeletePreview}
          handleOpenPublishConfig={handleOpenPublishConfig}
          handleOpenInstagram={handleOpenInstagram}
          handleOpenLinkedln={handleOpenLinkedln}
          handlePublishAgain={handlePublishAgain}
        />
      )}

      {isAlertOpen("publishConfig") && (
        <Alert
          title={t("previewProjects.configurePublish")}
          description={t("previewProjects.configureDescription")}
          icon={CalendarDaysIcon}
          onAccept={handlePublishProject}
          onCancel={closeAlert}
          disabledConfirmButton={
            hasDateValidationError ||
            (!socialNetworks.instagram &&
              !socialNetworks.linkedln &&
              !!publishDate)
          }
        >
          <ConfigPublish
            publishDate={publishDate}
            socialNetworks={socialNetworks}
            onDateChange={(newDate) => setPublishDate(newDate)}
            onSocialNetworkChange={handleSocialNetworkChange}
            onValidationChange={setHasDateValidationError}
            onPublishNowChange={setPublishNow}
          />
        </Alert>
      )}

      {isAlertOpen("delete") && (
        <Alert
          title={t("previewProjects.deleteProject")}
          description={t("previewProjects.deleteDescription")}
          onAccept={handleConfirmDelete}
          onCancel={closeAlert}
        />
      )}

      {isAlertOpen("publishAgain") && (
        <Alert
          title={t("previewProjects.publishAgain")}
          description={t("previewProjects.publishAgainDescription")}
          icon={CalendarDaysIcon}
          onAccept={handleConfirmPublishAgain}
          onCancel={closeAlert}
        />
      )}

      {showSuccessAlert && (
        <Alert
          title="¡Éxito!"
          description="La nueva versión de la publicación se ha creado correctamente."
          onAccept={() => setShowSuccessAlert(false)}
        />
      )}

      {isIterating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#d8e4d6] p-5 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]">
          <WorkingInProgress
            customMessages={[
              "Iterando la nueva descripción...",
              "Esto puede tardar unos segundos...",
              "No refresques la página, estamos trabajando...",
            ]}
            messageInterval={7000}
          />
        </div>
      )}
    </DashboardPage>
  );
};
