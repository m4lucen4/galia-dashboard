import { BrowserFrame } from "@/features/newWeb/components/ui/BrowserFrame";

type PortfolioProject = {
  id: string;
  label: string;
};

type PortfolioPreviewProps = {
  address: string;
  studio: string;
  projects: readonly PortfolioProject[];
  className?: string;
};

export const PortfolioPreview = ({
  address,
  studio,
  projects,
  className,
}: PortfolioPreviewProps) => (
  <BrowserFrame
    address={address}
    aria-label="Ilustración de un portfolio de estudio, no es una web interactiva"
    className={className}
  >
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[20px] font-medium">{studio}</span>
        <span className="text-[14px]">Proyectos · Estudio · Contacto</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {projects.map(({ id, label }) => (
          <div
            key={id}
            className="flex h-35 items-center justify-center rounded-[12px] bg-[#d8e4d6] font-['Geist_Mono',monospace] text-[13px]"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  </BrowserFrame>
);
