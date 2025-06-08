import { useState } from "react";
import { PreviewProjectDataProps } from "../types";

export type AlertType = "delete" | "publishAgain" | "publishConfig";

interface AlertConfig {
  type: AlertType;
  project?: PreviewProjectDataProps;
}

export const useAlertManager = () => {
  const [activeAlert, setActiveAlert] = useState<AlertConfig | null>(null);

  const openAlert = (type: AlertType, project?: PreviewProjectDataProps) => {
    setActiveAlert({ type, project });
  };

  const closeAlert = () => {
    setActiveAlert(null);
  };

  const isAlertOpen = (type: AlertType) => {
    return activeAlert?.type === type;
  };

  const getSelectedProject = () => {
    return activeAlert?.project || null;
  };

  return {
    activeAlert,
    openAlert,
    closeAlert,
    isAlertOpen,
    getSelectedProject,
  };
};
