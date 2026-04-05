import React from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/shared/ui/Button";

export const ProjectsPageInfo: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
      <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
      <div className="space-y-2">
        <p className="text-sm text-blue-800">
          Esta página muestra automáticamente todos tus proyectos. Para
          gestionar tus proyectos, ve a la sección Proyectos.
        </p>
        <Button
          title="Ir a Proyectos"
          onClick={() => navigate("/projects")}
          secondary
        />
      </div>
    </div>
  );
};
