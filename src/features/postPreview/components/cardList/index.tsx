import React from "react";
import { PreviewProjectDataProps } from "../../../../types";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../../components/shared/ui/Button";
import { InstagramIcon, LinkedInIcon } from "../../../../components/icons";
import { isDateInPast, truncateText } from "../../../../helpers";
import { useTranslation } from "react-i18next";
import { PublishStatusMessage } from "./PublishStatusMessage";
import { SocialMediaResults } from "./SocialMediaResults";
import { ProjectInfo } from "./ProjectInfo";
import { ProjectMenu } from "./ProjectMenu";

interface CardsListProps {
  projects: PreviewProjectDataProps[];
  openMenuId: string | null;
  handleToggleMenu: (projectId: string) => void;
  handleEditPreview: (project: PreviewProjectDataProps) => void;
  handleDeletePreview: (project: PreviewProjectDataProps) => void;
  handleOpenPublishConfig: (project: PreviewProjectDataProps) => void;
  handleOpenInstagram: (project: PreviewProjectDataProps) => void;
  handleOpenLinkedln: (project: PreviewProjectDataProps) => void;
}

export const CardsList: React.FC<CardsListProps> = ({
  projects,
  openMenuId,
  handleToggleMenu,
  handleEditPreview,
  handleDeletePreview,
  handleOpenPublishConfig,
  handleOpenInstagram,
  handleOpenLinkedln,
}) => {
  const { t } = useTranslation();
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.state !== b.state) {
      if (a.state === "preview") return -1;
      if (b.state === "preview") return 1;
    }

    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {Array.isArray(projects) &&
        sortedProjects.map((project: PreviewProjectDataProps) => (
          <div
            key={project.id}
            className="bg-white border border-black rounded-lg shadow-md overflow-hidden"
          >
            {project.image_data && project.image_data.length > 0 ? (
              <div className="w-full h-48 overflow-hidden">
                <img
                  src={
                    project.image_data.find(
                      (image) => image.status !== "not_selected"
                    )?.url || project.image_data[0].url
                  }
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
                <ProjectMenu
                  project={project}
                  isOpen={openMenuId === project.id}
                  onToggleMenu={handleToggleMenu}
                  onEditPreview={handleEditPreview}
                  onDeletePreview={handleDeletePreview}
                />
              </div>
              <ProjectInfo project={project} />
            </div>

            {project.state !== "published" && (
              <div className="p-5 pt-0 flex justify-between items-center mt-2">
                <div className="flex gap-3">
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
                <Button
                  title={t("previewProjects.publish")}
                  disabled={isDateInPast(project.publishDate)}
                  onClick={() => handleOpenPublishConfig(project)}
                />
              </div>
            )}
            <SocialMediaResults
              instagramResult={project.instagramResult}
              linkedlnResult={project.linkedlnResult}
            />
            {project.publishDate && (
              <PublishStatusMessage publishDate={project.publishDate} />
            )}
          </div>
        ))}
    </div>
  );
};
