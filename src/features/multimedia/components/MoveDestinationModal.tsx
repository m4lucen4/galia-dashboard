import { useEffect, useRef, useState } from "react";
import { FolderIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { supabase } from "../../../helpers/supabase";
import { Alert } from "../../../components/shared/ui/Alert";
import { Breadcrumbs } from "./Breadcrumbs";

const bucketName = "user-media";
const listLimit = 1_000;
const protectedProjectRoot = "/proyectos";

interface MoveDestinationModalProps {
  isOpen: boolean;
  userId: string;
  selectedCount: number;
  moving: boolean;
  onClose: () => void;
  onConfirm: (destinationPath: string) => void;
}

const buildFolderPath = (parentPath: string, folderName: string) =>
  parentPath === "/" ? `/${folderName}` : `${parentPath}/${folderName}`;

const isProtectedProjectPath = (path: string) =>
  path === protectedProjectRoot || path.startsWith(`${protectedProjectRoot}/`);

export const MoveDestinationModal = ({
  isOpen,
  userId,
  selectedCount,
  moving,
  onClose,
  onConfirm,
}: MoveDestinationModalProps) => {
  const { t } = useTranslation();
  const [destinationPath, setDestinationPath] = useState("/");
  const [folders, setFolders] = useState<string[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [folderError, setFolderError] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const loadFolders = async () => {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(`${userId}${destinationPath}`, { limit: listLimit });

      if (requestId !== requestIdRef.current) return;

      if (error || !data || data.length === listLimit) {
        setFolders([]);
        setFolderError(true);
      } else {
        setFolders(
          data
            .filter((item) => item.id === null && item.name !== ".keep")
            .map((item) => item.name)
            .filter(
              (folderName) =>
                !isProtectedProjectPath(
                  buildFolderPath(destinationPath, folderName),
                ),
            ),
        );
      }

      setLoadingFolders(false);
    };

    void loadFolders();

    return () => {
      requestIdRef.current += 1;
    };
  }, [destinationPath, isOpen, userId]);

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    if (!moving && !isProtectedProjectPath(path)) {
      setLoadingFolders(true);
      setFolderError(false);
      setFolders([]);
      setDestinationPath(path);
    }
  };

  const canConfirm = !moving && !loadingFolders && !folderError;

  return (
    <Alert
      title={t("multimedia.moveDestinationTitle")}
      description={t("multimedia.moveDestinationDescription", {
        count: selectedCount,
      })}
      onAccept={() => onConfirm(destinationPath)}
      onCancel={moving ? undefined : onClose}
      icon={FolderIcon}
      iconClassName="size-6 text-white"
      disabledConfirmButton={!canConfirm}
    >
      <div className="space-y-3">
        <Breadcrumbs
          currentPath={destinationPath}
          onNavigate={handleNavigate}
        />

        {loadingFolders && (
          <p className="text-sm text-gray-500">{t("multimedia.loadingFolders")}</p>
        )}

        {folderError && (
          <p className="text-sm text-red-600">{t("multimedia.folderLoadError")}</p>
        )}

        {!loadingFolders && !folderError && folders.length === 0 && (
          <p className="text-sm text-gray-500">{t("multimedia.noSubfolders")}</p>
        )}

        {!loadingFolders && !folderError && folders.length > 0 && (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-2">
            {folders.map((folderName) => {
              const folderPath = buildFolderPath(destinationPath, folderName);

              return (
                <button
                  key={folderPath}
                  type="button"
                  onClick={() => handleNavigate(folderPath)}
                  disabled={moving}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FolderIcon className="h-5 w-5 text-blue-600" />
                  {folderName}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Alert>
  );
};
