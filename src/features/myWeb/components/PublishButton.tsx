import React from "react";
import { SiteDataProps } from "../../../types";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { publishSite } from "../../../redux/actions/SiteActions";
import { Button } from "../../../components/shared/ui/Button";
import {
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface PublishButtonProps {
  site: SiteDataProps;
  onSave: () => void;
}

export const PublishButton: React.FC<PublishButtonProps> = ({ site, onSave }) => {
  const dispatch = useAppDispatch();
  const { publishRequest, saveRequest } = useAppSelector((state) => state.site);

  const handleTogglePublish = () => {
    dispatch(publishSite({ siteId: site.id, published: !site.published }));
  };

  const previewUrl = `${window.location.origin}/sites/${site.slug}`;

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md bg-white">
      <div className="flex items-center gap-3">
        <GlobeAltIcon className="h-5 w-5 text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-900">
            Estado de publicación
          </p>
          <p className="text-xs text-gray-500">
            {site.published ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Publicada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                No publicada
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          title={saveRequest.inProgress ? "Guardando..." : "Guardar"}
          onClick={onSave}
          disabled={saveRequest.inProgress}
          secondary
        />
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          Vista previa
        </a>
        <Button
          title={site.published ? "Despublicar" : "Publicar web"}
          onClick={handleTogglePublish}
          disabled={publishRequest.inProgress}
          secondary={site.published}
        />
      </div>
    </div>
  );
};
