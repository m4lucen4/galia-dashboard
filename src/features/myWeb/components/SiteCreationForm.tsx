import { PillButton } from "@/components/shared/ui/PillButton";
import {
  myWebControlClassName,
  myWebHeadingClassName,
  myWebLabelClassName,
  myWebMutedClassName,
  myWebPanelClassName,
} from "@/features/myWeb/components/myWebStyles";

interface SiteCreationFormProps {
  studioName: string;
  slug: string;
  inProgress: boolean;
  errorMessage?: string;
  onStudioNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onCreate: () => void;
}

export const SiteCreationForm = ({
  studioName,
  slug,
  inProgress,
  errorMessage,
  onStudioNameChange,
  onSlugChange,
  onCreate,
}: SiteCreationFormProps) => {
  return (
    <div className={myWebPanelClassName}>
      <div className="space-y-2">
        <h2 className={myWebHeadingClassName}>Tu estudio, en la web</h2>
        <p className={myWebMutedClassName}>
          Elige el nombre y la dirección de tu estudio. Después podrás personalizar
          el diseño y añadir tus proyectos antes de publicar.
        </p>
      </div>
      <div className="space-y-2">
        <label className={myWebLabelClassName} htmlFor="studio_name_create">
          Nombre del estudio
        </label>
        <input
          className={myWebControlClassName}
          id="studio_name_create"
          type="text"
          value={studioName}
          onChange={(event) => onStudioNameChange(event.target.value)}
          required
          placeholder="Mi Estudio de Arquitectura"
        />
      </div>
      <div className="space-y-2">
        <label className={myWebLabelClassName} htmlFor="slug_create">
          Dirección de tu web
        </label>
        <input
          className={myWebControlClassName}
          id="slug_create"
          type="text"
          value={slug}
          onChange={(event) => onSlugChange(event.target.value)}
          required
          aria-describedby="slug_create_help"
          placeholder="mi-estudio"
        />
        <p id="slug_create_help" className={myWebMutedClassName}>
          Solo letras minúsculas, números y guiones. Tu dirección será
          {" "}<span className="break-all">https://sites.mocklab.app/{slug || "mi-estudio"}</span>.
        </p>
      </div>
      <PillButton onClick={onCreate} disabled={inProgress || !studioName || !slug}>
        {inProgress ? "Creando tu web..." : "Crear mi web"}
      </PillButton>
      {errorMessage && (
        <p role="alert" className="text-sm text-red-700">{errorMessage}</p>
      )}
    </div>
  );
};
