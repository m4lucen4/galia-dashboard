import type { ProjectDataProps } from "@/types";
import { ChevronDownIcon, ChevronUpIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { myWebIconButtonClassName, myWebMutedClassName } from "@/features/myWeb/components/myWebStyles";

interface ProjectOrderListProps {
  projects: ProjectDataProps[];
  hiddenProjects: string[];
  loading: boolean;
  disabled: boolean;
  onToggleHidden: (id: string) => void;
  onMove: (index: number, direction: "up" | "down") => void;
}

export const ProjectOrderList = ({ projects, hiddenProjects, loading, disabled, onToggleHidden, onMove }: ProjectOrderListProps) => (
  <div className="min-w-0 space-y-3">
    <h3 className="text-base font-medium">Orden y visibilidad de proyectos</h3>
    <p className={myWebMutedClassName}>Ordena tus proyectos y elige cuáles aparecen en tu web.</p>
    {loading ? (
      <p role="status" className={`${myWebMutedClassName} py-4`}>Cargando proyectos...</p>
    ) : projects.length === 0 ? (
      <p className={`${myWebMutedClassName} py-4`}>No hay proyectos disponibles.</p>
    ) : (
      <div className="max-h-[420px] space-y-2 overflow-y-auto p-1">
        {projects.map((project, index) => {
          const projectId = String(project.id);
          const isHidden = hiddenProjects.includes(projectId);
          return (
            <div key={project.id} className={`flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-[#010000]/20 p-3 ${isHidden ? "bg-[#010000]/5" : ""}`}>
              <div className="min-w-0 flex-1 basis-40">
                <span className="block font-mono text-xs text-[#010000]/60">{projectId.slice(0, 8)}</span>
                <span className={`block truncate text-sm ${isHidden ? "text-[#010000]/60 line-through" : ""}`}>{project.title}</span>
                {isHidden && <span className="text-xs text-[#010000]/60">Oculto en tu web</span>}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => onToggleHidden(projectId)} disabled={disabled} className={myWebIconButtonClassName} aria-label={`${isHidden ? "Mostrar" : "Ocultar"} proyecto: ${project.title}`}>
                  {isHidden ? <EyeSlashIcon className="size-4" aria-hidden="true" /> : <EyeIcon className="size-4" aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => onMove(index, "up")} disabled={index === 0 || disabled} className={myWebIconButtonClassName} aria-label={`Subir proyecto: ${project.title}`}>
                  <ChevronUpIcon className="size-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onMove(index, "down")} disabled={index === projects.length - 1 || disabled} className={myWebIconButtonClassName} aria-label={`Bajar proyecto: ${project.title}`}>
                  <ChevronDownIcon className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
