import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";
import { usePreviewProjectsData } from "../hooks/usePreviewProjectsData";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { PreviewProjectDataProps } from "../types";
import { Drawer } from "../components/shared/ui/Drawer";
import InstagramPost from "../components/previewProjects/InstagramPost";
import { fetchPreviewProjectById } from "../redux/actions/PreviewProjectActions";
import LinkedInPost from "../components/previewProjects/LinkedinPost";
import { Button } from "../components/shared/ui/Button";
import { InstagramIcon, LinkedInIcon } from "../components/icons";
import { formatDateToDDMMYYYY } from "../helpers";
import { fetchUserByUid } from "../redux/actions/UserActions";

export const PreviewProjects = () => {
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [seeInstagram, setSeeInstagram] = useState(false);
  const [seeLinkedln, setSeeLinkedln] = useState(false);
  const user = useAppSelector((state: RootState) => state.auth.user);
  const { userData } = useAppSelector((state: RootState) => state.user);
  const { projects, project } = useAppSelector(
    (state: RootState) => state.previewProject
  );

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
                <h4 className="font-semibold text-lg text-gray-800 mb-2 line-clamp-2">
                  {project.id} - {project.title}
                </h4>
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

              <div className="p-5 pt-0 flex gap-3 items-center justify-end border-t border-gray-100 mt-2">
                <Button title="Publish" />
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
            </div>
          ))}
      </div>
    </div>
  );
};
