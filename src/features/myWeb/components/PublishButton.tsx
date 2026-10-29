import React from "react";
import { SiteDataProps } from "@/types";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { publishSite } from "@/redux/actions/SiteActions";
import { PillButton } from "@/components/shared/ui/PillButton";
import {
  myWebMutedClassName,
} from "@/features/myWeb/components/myWebStyles";
import {
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface PublishButtonProps {
  site: SiteDataProps;
  onSave: () => void;
  showSave?: boolean;
}

export const PublishButton: React.FC<PublishButtonProps> = ({
  site,
  onSave,
  showSave = true,
}) => {
  const dispatch = useAppDispatch();
  const { publishRequest, saveRequest } = useAppSelector((state) => state.site);

  const handleTogglePublish = () => {
    dispatch(publishSite({ siteId: site.id, published: !site.published }));
  };

  const previewUrl = `https://sites.mocklab.app/${site.slug}`;

  return (
    <section aria-label="Publicación de tu web" className="@container min-w-0 space-y-3 rounded-[28px] border border-[#010000]/20 p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-3 @min-[52rem]:flex-row @min-[52rem]:items-center @min-[52rem]:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <GlobeAltIcon aria-hidden="true" className="mt-1 size-6 shrink-0" />
          <div className="min-w-0 space-y-1">
            <h2 className="text-sm font-medium">Estado de publicación</h2>
            <p className="flex items-center gap-2 text-sm">
              <span aria-hidden="true" className={`size-2 rounded-full ${site.published ? "bg-green-700" : "bg-[#010000]/40"}`} />
              {site.published ? "Publicada" : "No publicada"}
            </p>
            <p className={`${myWebMutedClassName} break-all`}>{previewUrl}</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {showSave && (
            <PillButton
              onClick={onSave}
              disabled={saveRequest.inProgress}
              variant="outline"
            >
              {saveRequest.inProgress ? "Guardando..." : "Guardar configuración"}
            </PillButton>
          )}
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-[1.5px] border-[#010000] px-5 py-3 text-sm font-medium hover:bg-[#010000] hover:text-[#d8e4d6] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-4"
          >
            <ArrowTopRightOnSquareIcon aria-hidden="true" className="size-4" />
            Vista previa
          </a>
          <PillButton
            onClick={handleTogglePublish}
            disabled={publishRequest.inProgress}
            variant={site.published ? "outline" : "solid"}
          >
            {site.published ? "Despublicar" : "Publicar web"}
          </PillButton>
        </div>
      </div>
      <p className={myWebMutedClassName}>
        {showSave
          ? "Guarda la configuración con este botón. El contenido de cada página se guarda desde su editor."
          : "Guarda los cambios de contenido desde cada editor. La configuración se guarda en su pestaña."}
      </p>
    </section>
  );
};
