import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CalendarDaysIcon } from "@heroicons/react/24/outline";

import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { usePreviewProjectsData } from "../../../hooks/usePreviewProjectsData";
import { useAlertManager } from "../../../hooks/useAlertManager";
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
import { fetchUserByUid } from "../../../redux/actions/UserActions";
import { Alert } from "../../../components/shared/ui/Alert";
import { ConfigPublish } from "../components/configPublish";
import { CardsList } from "../components/cardList";
import { PreviewProjectForm } from "../../../components/previewProjects/PreviewProjectForm";
import { Filters } from "../components/Filters";

export const PreviewProjects = () => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { openAlert, closeAlert, isAlertOpen, getSelectedProject } =
    useAlertManager();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [seeInstagram, setSeeInstagram] = useState(false);
  const [seeLinkedln, setSeeLinkedln] = useState(false);
  const [seeEditPreview, setEditSeePreview] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [publishDate, setPublishDate] = useState<string>("");
  const [socialNetworks, setSocialNetworks] = useState<SocialNetworksCheck>({
    instagram: false,
    linkedln: false,
  });
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const user = useAppSelector((state: RootState) => state.auth.user);
  const { userData } = useAppSelector((state: RootState) => state.user);
  const { projects, project, previewProjectUpdateRequest } = useAppSelector(
    (state: RootState) => state.previewProject
  );

  const filteredProjects = projects.filter((project) => {
    if (selectedFilter === "all") return true;
    return project.state === selectedFilter;
  });

  const handleToggleMenu = (projectId: string) => {
    if (openMenuId === projectId) {
      setOpenMenuId(null);
    } else {
      setOpenMenuId(projectId);
    }
  };

  const handleEditPreview = (project: PreviewProjectDataProps) => {
    dispatch(fetchPreviewProjectById(project.id));
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

  const handleOpenInstagram = (project: PreviewProjectDataProps) => {
    dispatch(fetchPreviewProjectById(project.id));
    setSeeInstagram(true);
    setDrawerOpen(true);
  };

  const handleOpenLinkedln = (project: PreviewProjectDataProps) => {
    dispatch(fetchPreviewProjectById(project.id));
    setSeeLinkedln(true);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setSeeInstagram(false);
    setSeeLinkedln(false);
    setEditSeePreview(false);
    setDrawerOpen(false);
  };

  const handleSavePreviewProject = () => {
    setEditSeePreview(false);
    setDrawerOpen(false);
    fetchPreviewProjectsData();
  };

  const getDrawerTitle = () => {
    if (seeInstagram) return t("previewProjects.instagramPreview");
    if (seeLinkedln) return t("previewProjects.linkedlnPreview");
    if (seeEditPreview) return t("previewProjects.editPreviewProject");
    return t("previewProjects.previewProject");
  };

  const handleOpenPublishConfig = (project: PreviewProjectDataProps) => {
    if (project.publishDate) {
      const dateOnly = project.publishDate.split("T")[0];
      setPublishDate(dateOnly);
    } else {
      setPublishDate("");
    }

    setSocialNetworks({
      instagram: project.checkSocialNetworks?.instagram || false,
      linkedln: project.checkSocialNetworks?.linkedln || false,
    });

    openAlert("publishConfig", project);
  };

  const handleSocialNetworkChange = (
    network: "instagram" | "linkedln",
    pageInfo?: LinkedInPageInfo | InstagramPageInfo
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
        })
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
      <div className="text-center py-8 text-gray-500">
        {t("previewProjects.noProjects")}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        {t("previewProjects.title")}
      </h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-7xl text-sm/6 text-gray-500">
          {t("previewProjects.description")}
        </p>
      </div>

      <Filters
        projects={projects}
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />

      <Drawer
        title={getDrawerTitle()}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
      >
        {seeInstagram && project && userData && (
          <InstagramPost project={project} user={userData} />
        )}
        {seeLinkedln && project && userData && (
          <LinkedInPost project={project} user={userData} />
        )}
        {seeEditPreview && project && (
          <PreviewProjectForm
            project={project}
            onSave={handleSavePreviewProject}
            loading={previewProjectUpdateRequest.inProgress}
          />
        )}
      </Drawer>

      <CardsList
        projects={filteredProjects}
        openMenuId={openMenuId}
        handleToggleMenu={handleToggleMenu}
        handleEditPreview={handleEditPreview}
        handleDeletePreview={handleDeletePreview}
        handleOpenPublishConfig={handleOpenPublishConfig}
        handleOpenInstagram={handleOpenInstagram}
        handleOpenLinkedln={handleOpenLinkedln}
        handlePublishAgain={handlePublishAgain}
      />

      {isAlertOpen("publishConfig") && (
        <Alert
          title={t("previewProjects.configurePublish")}
          description={t("previewProjects.configureDescription")}
          icon={CalendarDaysIcon}
          onAccept={handlePublishProject}
          onCancel={closeAlert}
          disabledConfirmButton={
            !socialNetworks.instagram &&
            !socialNetworks.linkedln &&
            !!publishDate
          }
        >
          <ConfigPublish
            publishDate={publishDate}
            socialNetworks={socialNetworks}
            onDateChange={(newDate) => setPublishDate(newDate)}
            onSocialNetworkChange={handleSocialNetworkChange}
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
    </div>
  );
};
