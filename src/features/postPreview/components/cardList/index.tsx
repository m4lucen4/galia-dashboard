import React from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { PreviewProjectDataProps, PublicationTarget } from "../../../../types";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { Button } from "../../../../components/shared/ui/Button";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "../../../../components/icons";
import { isDateInPast, truncateText } from "../../../../helpers";
import { SOCIAL_PUBLISHING_EDGE_ENABLED } from "../../../../helpers/publishDate";
import { useTranslation } from "react-i18next";
import { PublishStatusMessage } from "./PublishStatusMessage";
import { SocialMediaResults } from "./SocialMediaResults";
import { ProjectInfo } from "./ProjectInfo";
import { CardThumbnail } from "./CardThumbnail";
import { useVideoPosterUrls } from "@/features/projects/videos/useVideoPosterUrls";
import { ProjectMenu } from "./ProjectMenu";
import { Pagination } from "@/components/shared/ui/Pagination";
import { useHasValidSubscription } from "../../../../hooks/useHasValidSubscription";
import { sortPreviewProjects } from "../../helpers/sortProjects";
import { isRunning, type TargetsByPreview } from "../../helpers/publicationTargets";

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
  canDeletePreview: (project: PreviewProjectDataProps) => boolean;
  handleOpenPublishConfig: (project: PreviewProjectDataProps) => void;
  handleOpenInstagram: (project: PreviewProjectDataProps) => void;
  handleOpenLinkedln: (project: PreviewProjectDataProps) => void;
  handleOpenFacebook: (project: PreviewProjectDataProps) => void;
  handlePublishAgain: (project: PreviewProjectDataProps) => void;
  /** Edge pipeline only: current publication_targets by publication id. */
  targetsByPreview?: TargetsByPreview;
  isPublicationBusy?: (previewId: string) => boolean;
  onRetryTarget?: (target: PublicationTarget) => void;
  onReschedule?: (project: PreviewProjectDataProps) => void;
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
  canDeletePreview,
  handleOpenPublishConfig,
  handleOpenInstagram,
  handleOpenLinkedln,
  handleOpenFacebook,
  handlePublishAgain,
  targetsByPreview,
  isPublicationBusy,
  onRetryTarget,
  onReschedule,
}) => {
  const { t } = useTranslation();
  const hasValidSubscription = useHasValidSubscription();

  const sortedProjects = sortPreviewProjects(projects);

  const targetsOf = (project: PreviewProjectDataProps) =>
    targetsByPreview?.[String(project.id)];
  const publishBlocked = (project: PreviewProjectDataProps) =>
    isDateInPast(project.publishDate) ||
    !hasValidSubscription ||
    (targetsOf(project) ?? []).some(isRunning);
  const results = (project: PreviewProjectDataProps) => (
    <SocialMediaResults
      instagramResult={project.instagramResult}
      linkedlnResult={project.linkedlnResult}
      targets={targetsOf(project)}
      busy={isPublicationBusy?.(String(project.id))}
      onRetry={onRetryTarget}
      onReschedule={onReschedule ? () => onReschedule(project) : undefined}
    />
  );

  const totalItems = sortedProjects.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProjects = sortedProjects.slice(startIndex, endIndex);
  const posters = useVideoPosterUrls(currentProjects.map((p) => p.video_id));
  const paginationState = {
    pageIndex: currentPage - 1,
    pageSize: itemsPerPage,
  };
  const paginationTable = useReactTable({
    data: sortedProjects,
    columns: [],
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    autoResetPageIndex: false,
    pageCount: totalPages,
    state: { pagination: paginationState },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(paginationState) : updater;
      onPageChange(next.pageIndex + 1);
    },
  });
  const pagination = totalPages > 1 ? (
    <div className="overflow-hidden rounded-[28px] border border-[#010000]/20">
      <Pagination
        table={paginationTable}
        variant="dashboard"
        summaryExtra={
          <div className="flex items-center gap-3">
            <label htmlFor="items-per-page" className="text-sm whitespace-nowrap text-[#010000]/70">
              {t("shared.itemsPerPage")}:
            </label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(event) => onItemsPerPageChange(Number(event.target.value))}
              className="rounded-full border border-[#010000]/30 bg-transparent px-3 py-2 text-sm text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
          </div>
        }
      />
    </div>
  ) : null;

  // Grid view
  if (viewMode === "grid") {
    return (
      <div className="min-w-0 font-['Hanken_Grotesk',sans-serif] text-[#010000]">
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 mb-6">
          {Array.isArray(currentProjects) &&
            currentProjects.map((project: PreviewProjectDataProps) => (
              <div
                key={project.id}
                className="min-w-0 rounded-[28px] border border-[#010000]/25 bg-white/35"
              >
                <CardThumbnail
                  project={project}
                  posterUrl={project.video_id ? posters[project.video_id] : undefined}
                  imageClassName="w-full h-52 overflow-hidden rounded-t-[27px] border-b border-[#010000]/15"
                  placeholderClassName="w-full h-52 rounded-t-[27px] border-b border-[#010000]/15 bg-[#d8e4d6] flex items-center justify-center"
                />

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
                      canDelete={canDeletePreview(project)}
                      onPublishAgain={handlePublishAgain}
                    />
                  </div>
                  <ProjectInfo project={project} targets={targetsOf(project)} />
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
                      {SOCIAL_PUBLISHING_EDGE_ENABLED && (
                        <Button
                          icon={<FacebookIcon />}
                          secondary
                          onClick={() => handleOpenFacebook(project)}
                        />
                      )}
                    </div>
                    <Button
                      title={t("previewProjects.publish")}
                      disabled={publishBlocked(project)}
                      icon={!hasValidSubscription ? <LockClosedIcon className="h-3.5 w-3.5" /> : undefined}
                      onClick={() => handleOpenPublishConfig(project)}
                    />
                  </div>
                )}
                {results(project)}
                {project.publishDate && (
                  <PublishStatusMessage publishDate={project.publishDate} />
                )}
              </div>
            ))}
        </div>
        {pagination}
      </div>
    );
  }

  // List view
  return (
    <div className="min-w-0 font-['Hanken_Grotesk',sans-serif] text-[#010000]">
      <div className="space-y-4 mb-6">
        {Array.isArray(currentProjects) &&
          currentProjects.map((project: PreviewProjectDataProps) => (
            <div
              key={project.id}
              className="min-w-0 rounded-[28px] border border-[#010000]/25 bg-white/35 flex flex-col lg:flex-row"
            >
              {/* Image panel */}
              <CardThumbnail
                project={project}
                posterUrl={project.video_id ? posters[project.video_id] : undefined}
                imageClassName="w-full lg:w-56 xl:w-64 h-52 lg:h-auto lg:min-h-52 overflow-hidden rounded-t-[27px] lg:rounded-tr-none lg:rounded-l-[27px] shrink-0"
                placeholderClassName="w-full lg:w-56 xl:w-64 h-52 lg:h-auto lg:min-h-52 rounded-t-[27px] lg:rounded-tr-none lg:rounded-l-[27px] bg-[#d8e4d6] flex items-center justify-center shrink-0"
              />

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
                      canDelete={canDeletePreview(project)}
                      onPublishAgain={handlePublishAgain}
                    />
                  </div>
                  <ProjectInfo project={project} targets={targetsOf(project)} />
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
                        {SOCIAL_PUBLISHING_EDGE_ENABLED && (
                          <Button
                            icon={<FacebookIcon />}
                            secondary
                            onClick={() => handleOpenFacebook(project)}
                          />
                        )}
                      </div>
                      <Button
                        title={t("previewProjects.publish")}
                        disabled={publishBlocked(project)}
                        icon={!hasValidSubscription ? <LockClosedIcon className="h-3.5 w-3.5" /> : undefined}                 
                        onClick={() => handleOpenPublishConfig(project)}
                      />
                    </div>
                  )}
                  {results(project)}
                  {project.publishDate && (
                    <PublishStatusMessage publishDate={project.publishDate} />
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
      {pagination}
    </div>
  );
};
