import React from "react";
import { useTranslation } from "react-i18next";
import { formatDateToDDMMYYYY } from "../../../../helpers";
import { PreviewProjectDataProps } from "../../../../types";

interface ProjectInfoProps {
  project: PreviewProjectDataProps;
}

export const ProjectInfo: React.FC<ProjectInfoProps> = ({ project }) => {
  const { t } = useTranslation();

  const getProjectStateInfo = () => {
    const { instagramResult, linkedlnResult, state } = project;

    // Si ambos resultados son null o undefined, usar el estado original
    if (!instagramResult && !linkedlnResult) {
      return {
        displayState: state,
        className:
          state === "published"
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-black",
      };
    }

    // Contar resultados exitosos y fallidos
    const successCount =
      (instagramResult === "true" ? 1 : 0) +
      (linkedlnResult === "true" ? 1 : 0);

    const failureCount =
      (instagramResult === "false" ? 1 : 0) +
      (linkedlnResult === "false" ? 1 : 0);

    const totalAttempts = (instagramResult ? 1 : 0) + (linkedlnResult ? 1 : 0);

    // Si todos los intentos fueron exitosos
    if (successCount === totalAttempts && totalAttempts > 0) {
      return {
        displayState: "published",
        className: "bg-green-100 text-green-800",
      };
    }

    // Si todos los intentos fallaron
    if (failureCount === totalAttempts && totalAttempts > 0) {
      return {
        displayState: "error en publicación",
        className: "bg-red-100 text-red-800",
      };
    }

    // Si hay mezcla de éxitos y fallos (publicación parcial)
    if (successCount > 0 && failureCount > 0) {
      return {
        displayState: "publicado con errores",
        className: "bg-yellow-100 text-yellow-800",
      };
    }

    // Si solo hay éxitos parciales (algunos null, algunos true, ningún false)
    if (successCount > 0 && failureCount === 0) {
      return {
        displayState: "publicado parcialmente",
        className: "bg-blue-100 text-blue-800",
      };
    }

    // Si solo hay fallos parciales (algunos null, algunos false, ningún true)
    if (failureCount > 0 && successCount === 0) {
      return {
        displayState: "error parcial",
        className: "bg-orange-100 text-orange-800",
      };
    }

    // Caso por defecto
    return {
      displayState: state,
      className:
        state === "published"
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-black",
    };
  };

  const stateInfo = getProjectStateInfo();

  return (
    <div className="mb-3">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">
            {t("previewProjects.createdAt")}{" "}
            {project.created_at
              ? formatDateToDDMMYYYY(project.created_at)
              : "N/A"}
          </span>
          {project.publishDate && (
            <span className="text-sm text-gray-500">
              {t("previewProjects.publishedAt")}{" "}
              {formatDateToDDMMYYYY(project.publishDate)}
            </span>
          )}
        </div>
        <span
          className={`px-2.5 py-0.5 text-xs rounded-full ${stateInfo.className}`}
        >
          {stateInfo.displayState}
        </span>
      </div>
    </div>
  );
};
