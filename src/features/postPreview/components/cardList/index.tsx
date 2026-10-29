import React from "react";
import { PreviewProjectDataProps } from "../../../../types";
import { DocumentTextIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../../components/shared/ui/Button";
import { InstagramIcon, LinkedInIcon } from "../../../../components/icons";
import { isDateInPast, truncateText } from "../../../../helpers";
import { useTranslation } from "react-i18next";
import { PublishStatusMessage } from "./PublishStatusMessage";
import { SocialMediaResults } from "./SocialMediaResults";
import { ProjectInfo } from "./ProjectInfo";
import { ProjectMenu } from "./ProjectMenu";
import { CardsPagination } from "../../../../components/shared/ui/CardsPagination";
import { useHasValidSubscription } from "../../../../hooks/useHasValidSubscription";

interface CardsListProps {
  projects: PreviewProjectDataProps[];
  openMenuId: string | null;
  currentPage: number;
  viewMode: "grid" | "list";
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  handleToggleMenu: (projectId: string) => void;
  handleEditPreview: (project: PreviewProjectDataProps) => void;
  handleDeletePreview: (project: PreviewProjectDataProps) => void;
  handleOpenPublishConfig: (project: PreviewProjectDataProps) => void;
  handleOpenInstagram: (project: PreviewProjectDataProps) => void;
  handleOpenLinkedln: (project: PreviewProjectDataProps) => void;
  handlePublishAgain: (project: PreviewProjectDataProps) => void;
}

export const CardsList: React.FC<CardsListProps> = ({
  projects,
  openMenuId,
  currentPage,
  viewMode,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  handleToggleMenu,
  handleEditPreview,
  handleDeletePreview,
  handleOpenPublishConfig,
  handleOpenInstagram,
  handleOpenLinkedln,
  handlePublishAgain,
}) => {
  const { t } = useTranslation();
  const hasValidSubscription = useHasValidSubscription();

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.state !== b.state) {
      if (a.state === "preview") return -1;
      if (b.state === "preview") return 1;
    }

    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return (
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
  });

  const totalItems = sortedProjects.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProjects = sortedProjects.slice(startIndex, endIndex);

  // Grid view
  if (viewMode === "grid") {
    return (
      <div className="min-w-0 font-['Hanken_Grotesk',sans-serif] text-[#010000] [&>div:last-child]:rounded-[28px] [&>div:last-child]:border-[#010000]/20 [&>div:last-child]:bg-transparent [&_nav]:font-['Geist_Mono',monospace]">
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 mb-6">
          {Array.isArray(currentProjects) &&
            currentProjects.map((project: PreviewProjectDataProps) => (
              <div
                key={project.id}
                className="min-w-0 rounded-[28px] border border-[#010000]/25 bg-white/35"
              >
                {project.image_data && project.image_data.length > 0 ? (
                  <div className="w-full h-52 overflow-hidden rounded-t-[27px] border-b border-[#010000]/15">
                    <img
                      src={
                        project.image_data.find(
                          (image) => image.status !== "not_selected",
                        )?.url || project.image_data[0].url
                      }
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="w-full h-52 rounded-t-[27px] border-b border-[#010000]/15 bg-[#d8e4d6] flex items-center justify-center">
                    <DocumentTextIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="min-w-0 font-semibold text-xl leading-tight tracking-tight mb-3 line-clamp-2 flex-1 break-words">
                      {project.id} - {truncateText(project.title, 20)}
                    </h4>
                    <ProjectMenu
                      project={project}
                      isOpen={openMenuId === project.id}
                      onToggleMenu={handleToggleMenu}
                      onEditPreview={handleEditPreview}
                      onDeletePreview={handleDeletePreview}
                      onPublishAgain={handlePublishAgain}
                    />
                  </div>
                  <ProjectInfo project={project} />
                </div>

                {project.state !== "published" && (
                  <div className="p-5 pt-0 flex flex-wrap justify-between items-center gap-3 mt-2 [&_button]:rounded-full [&_button]:min-h-10 [&_button]:border-[#010000]/25">
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
                      disabled={isDateInPast(project.publishDate) || !hasValidSubscription}
                      icon={!hasValidSubscription ? <LockClosedIcon className="h-3.5 w-3.5" /> : undefined}
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
        <CardsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          onItemsPerPageChange={onItemsPerPageChange}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="min-w-0 font-['Hanken_Grotesk',sans-serif] text-[#010000] [&>div:last-child]:rounded-[28px] [&>div:last-child]:border-[#010000]/20 [&>div:last-child]:bg-transparent [&_nav]:font-['Geist_Mono',monospace]">
      <div className="space-y-4 mb-6">
        {Array.isArray(currentProjects) &&
          currentProjects.map((project: PreviewProjectDataProps) => (
            <div
              key={project.id}
              className="min-w-0 rounded-[28px] border border-[#010000]/25 bg-white/35 flex flex-col lg:flex-row"
            >
              {/* Image panel */}
              {project.image_data && project.image_data.length > 0 ? (
                <div className="w-full lg:w-56 xl:w-64 h-52 lg:h-auto lg:min-h-52 overflow-hidden rounded-t-[27px] lg:rounded-tr-none lg:rounded-l-[27px] shrink-0">
                  <img
                    src={
                      project.image_data.find(
                        (image) => image.status !== "not_selected",
                      )?.url || project.image_data[0].url
                    }
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              ) : (
                <div className="w-full lg:w-56 xl:w-64 h-52 lg:h-auto lg:min-h-52 rounded-t-[27px] lg:rounded-tr-none lg:rounded-l-[27px] bg-[#d8e4d6] flex items-center justify-center shrink-0">
                  <DocumentTextIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}

              {/* Project details */}
              <div className="min-w-0 flex-1 flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <h4 className="min-w-0 font-semibold text-xl leading-tight tracking-tight flex-1 break-words">
                      {project.id} - {project.title}
                    </h4>
                    <ProjectMenu
                      project={project}
                      isOpen={openMenuId === project.id}
                      onToggleMenu={handleToggleMenu}
                      onEditPreview={handleEditPreview}
                      onDeletePreview={handleDeletePreview}
                      onPublishAgain={handlePublishAgain}
                    />
                  </div>
                  <ProjectInfo project={project} />
                </div>

                {/* Actions and publication results */}
                <div className="border-t border-[#010000]/15">
                  {project.state !== "published" && (
                    <div className="p-5 flex flex-wrap justify-between items-center gap-3 [&_button]:rounded-full [&_button]:min-h-10 [&_button]:border-[#010000]/25">
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
                        disabled={isDateInPast(project.publishDate) || !hasValidSubscription}
                        icon={!hasValidSubscription ? <LockClosedIcon className="h-3.5 w-3.5" /> : undefined}                 
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
              </div>
            </div>
          ))}
      </div>
      <CardsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
      />
    </div>
  );
};
