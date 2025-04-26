import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";
import { usePreviewProjectsData } from "../hooks/usePreviewProjectsData";
import {
  DocumentTextIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import { PreviewProjectDataProps, SocialNetworksCheck } from "../types";
import { Drawer } from "../components/shared/ui/Drawer";
import InstagramPost from "../components/previewProjects/InstagramPost";
import {
  fetchPreviewProjectById,
  updateProjectPublishing,
  deletePreviewProject,
} from "../redux/actions/PreviewProjectActions";
import LinkedInPost from "../components/previewProjects/LinkedinPost";
import { Button } from "../components/shared/ui/Button";
import { InstagramIcon, LinkedInIcon } from "../components/icons";
import { formatDateToDDMMYYYY, isDateInPast, truncateText } from "../helpers";
import { fetchUserByUid } from "../redux/actions/UserActions";
import { Alert } from "../components/shared/ui/Alert";
import { ConfigPublish } from "../components/previewProjects/ConfigPublish";

export const PreviewProjects = () => {
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [seeInstagram, setSeeInstagram] = useState(false);
  const [seeLinkedln, setSeeLinkedln] = useState(false);
  const [deleteProject, setDeleteProject] = useState(false);
  const [seePublishConfig, setSeePublishConfig] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] =
    useState<PreviewProjectDataProps | null>(null);
  const [publishDate, setPublishDate] = useState<string>("");
  const [socialNetworks, setSocialNetworks] = useState<SocialNetworksCheck>({
    instagram: false,
    linkedln: false,
  });
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { userData } = useAppSelector((state: RootState) => state.user);
  const { projects, project } = useAppSelector(
    (state: RootState) => state.previewProject
  );

  const handleToggleMenu = (projectId: string) => {
    if (openMenuId === projectId) {
      setOpenMenuId(null);
    } else {
      setOpenMenuId(projectId);
    }
  };

  const handleEditPreview = (project: PreviewProjectDataProps) => {
    // Implementar la lógica para editar fotos
    console.log("Edit photos for project:", project.id);
    setOpenMenuId(null);
  };

  const handleDeletePreview = (project: PreviewProjectDataProps) => {
    setSelectedProject(project);
    setDeleteProject(true);
    setOpenMenuId(null);
  };

  const handleConfirmDelete = () => {
    if (selectedProject) {
      dispatch(deletePreviewProject(selectedProject.id))
        .unwrap()
        .then(() => {
          setDeleteProject(false);
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
    setDrawerOpen(false);
  };

  const getDrawerTitle = () => {
    if (seeInstagram) return "Preview Instagram";
    if (seeLinkedln) return "Preview LinkedIn";
    return "Preview Project";
  };

  const handleOpenPublishConfig = (project: PreviewProjectDataProps) => {
    setSelectedProject(project);

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

    setSeePublishConfig(true);
  };

  const handleSocialNetworkChange = (network: "instagram" | "linkedln") => {
    setSocialNetworks((prev) => ({
      ...prev,
      [network]: !prev[network],
    }));
  };

  const handlePublishProject = () => {
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
          setSeePublishConfig(false);
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

  if (!user) {
    return;
  }

  if (!projects.length) {
    return (
      <div className="text-center py-8 text-gray-500">No preview projects</div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        Preview Projects
      </h3>
      <div className="flex justify-between items-center mb-4">
        <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
          From here you can see a preview of the projects before they are
          published
        </p>
      </div>
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
      </Drawer>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {Array.isArray(projects) &&
          projects.map((project: PreviewProjectDataProps) => (
            <div
              key={project.id}
              className="bg-white border border-black rounded-lg shadow-md overflow-hidden"
            >
              {project.image_data && project.image_data.length > 0 ? (
                <div className="w-full h-48 overflow-hidden">
                  <img
                    src={project.image_data[0].url}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}

              <div className="p-5">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-2 flex-1">
                    {project.id} - {truncateText(project.title, 20)}
                  </h4>
                  <div className="relative">
                    <button
                      className="p-1 rounded-full hover:bg-gray-100"
                      onClick={() => handleToggleMenu(project.id)}
                    >
                      <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                    </button>
                    {openMenuId === project.id && (
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white shadow-lg rounded-md border border-gray-100 z-10">
                        <ul className="py-1">
                          <li>
                            <button
                              onClick={() => handleEditPreview(project)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Edit project preview
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleDeletePreview(project)}
                              className="w-full text-left px-4 py-2 text-sm text-red-800 hover:bg-gray-100"
                            >
                              Delete project preview
                            </button>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-sm text-gray-500">
                    Created at:{" "}
                    {project.created_at
                      ? formatDateToDDMMYYYY(project.created_at)
                      : "N/A"}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-gray-100 text-black">
                    {project.state}
                  </span>
                </div>
              </div>

              <div className="p-5 pt-0 flex gap-3 items-center justify-end mt-2">
                <Button
                  title="Publish"
                  disabled={isDateInPast(project.publishDate)}
                  onClick={() => handleOpenPublishConfig(project)}
                />
                <Button
                  icon={<InstagramIcon />}
                  secondary
                  onClick={() => handleOpenInstagram(project)}
                />
                <Button
                  icon={<LinkedInIcon />}
                  secondary
                  onClick={() => handleOpenLinkedln(project)}
                />
              </div>
              {project.publishDate && (
                <div className="px-5 pb-4 mt-1">
                  <p className="text-xs text-gray-500 italic pt-2">
                    {isDateInPast(project.publishDate)
                      ? "This project has a past publication date"
                      : "You can modify the publication data until the day before the scheduled date"}
                  </p>
                </div>
              )}
            </div>
          ))}
      </div>
      {seePublishConfig && (
        <Alert
          title="Configure your publication"
          description="Select the date and social network where you want to publish"
          onAccept={handlePublishProject}
          onCancel={() => setSeePublishConfig(false)}
        >
          <ConfigPublish
            publishDate={publishDate}
            socialNetworks={socialNetworks}
            onDateChange={(newDate) => setPublishDate(newDate)}
            onSocialNetworkChange={handleSocialNetworkChange}
          />
        </Alert>
      )}
      {deleteProject && (
        <Alert
          title="Do you want to delete the project?"
          description="Are you sure you want to delete this project? This action cannot be undone."
          onAccept={handleConfirmDelete}
          onCancel={() => setDeleteProject(false)}
        />
      )}
    </div>
  );
};
