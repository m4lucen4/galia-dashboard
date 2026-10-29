import React, { useState, useEffect } from "react";
import { SiteComponentDataProps, SiteComponentType, ProjectColumnsConfig } from "@/types";
import { ComponentEditor } from "@/features/myWeb/components/ComponentEditor";
import { ComponentAnchorEditor } from "@/features/myWeb/components/ComponentAnchorEditor";
import { AddBlockMenu } from "@/features/myWeb/components/blocks/AddBlockMenu";
import { BlockCard } from "@/features/myWeb/components/blocks/BlockCard";
import { myWebMutedClassName } from "@/features/myWeb/components/myWebStyles";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchProjects, fetchProjectsByUserId } from "@/redux/actions/ProjectActions";
import {
  addSiteComponent,
  deleteSiteComponent,
  updateSiteComponent,
  reorderSiteComponents,
} from "@/redux/actions/SiteComponentActions";
import { Alert } from "@/components/shared/ui/Alert";

interface ComponentListProps {
  pageId: string;
  isHome?: boolean;
  components: SiteComponentDataProps[];
}

const BLOCK_OPTIONS: { type: SiteComponentType; label: string; description?: string }[] = [
  { type: "header", label: "Cabecera" },
  { type: "cta", label: "Llamada a la acción" },
  { type: "body", label: "Imágenes y texto", description: "Bloque de imágenes con texto descriptivo" },
  { type: "content", label: "Contenido", description: "Título, columnas de texto y datos estadísticos" },
  { type: "contact", label: "Contacto", description: "Información de contacto y dirección" },
  { type: "project_columns", label: "Proyectos destacados", description: "1 o 2 columnas con imagen, título, categoría y año" },
  { type: "rich_text", label: "Texto enriquecido", description: "Bloque de texto con negrita, cursiva y alineación" },
  { type: "separator", label: "Separador", description: "Espaciado vertical entre componentes" },
  { type: "figure", label: "Imagen con pie de foto", description: "Imagen a 50% o ancho completo con texto de pie de foto" },
  { type: "editorial_cards", label: "Tarjetas editoriales", description: "Dos tarjetas con imagen, texto y enlace" },
];

export const ComponentList: React.FC<ComponentListProps> = ({
  pageId,
  isHome = false,
  components,
}) => {
  const dispatch = useAppDispatch();
  const { projects } = useAppSelector((state) => state.project);
  const { deleteRequest } = useAppSelector((state) => state.siteComponent);
  const user = useAppSelector((state) => state.auth.user);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const hasProjectColumns = components.some((c) => c.type === "project_columns");
    if (hasProjectColumns && projects.length === 0 && user?.uid) {
      if (user.role === "admin") {
        dispatch(fetchProjects());
      } else {
        dispatch(fetchProjectsByUserId(user.uid));
      }
    }
  }, [dispatch, components, projects.length, user]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleAdd = (type: SiteComponentType) => {
    dispatch(
      addSiteComponent({
        pageId,
        type,
        position: components.length,
      }),
    );
    setShowAddMenu(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteRequest.inProgress) return;
    const result = await dispatch(deleteSiteComponent(deleteTarget));
    if (deleteSiteComponent.fulfilled.match(result)) {
      setDeleteTarget(null);
      if (expandedId === deleteTarget) setExpandedId(null);
    }
  };

  const handleToggleVisible = (component: SiteComponentDataProps) => {
    dispatch(
      updateSiteComponent({
        componentId: component.id,
        updates: { visible: !component.visible },
      }),
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updates = [
      { id: components[index].id, position: index - 1 },
      { id: components[index - 1].id, position: index },
    ];
    dispatch(reorderSiteComponents(updates));
  };

  const handleMoveDown = (index: number) => {
    if (index >= components.length - 1) return;
    const updates = [
      { id: components[index].id, position: index + 1 },
      { id: components[index + 1].id, position: index },
    ];
    dispatch(reorderSiteComponents(updates));
  };

  const getComponentLabel = (type: string) => {
    const found = BLOCK_OPTIONS.find((ct) => ct.type === type);
    return found ? found.label : type;
  };

  const getProjectColumnsSummary = (component: SiteComponentDataProps): string | null => {
    if (component.type !== "project_columns") return null;
    const cfg = component.config;
    if (Array.isArray(cfg) || !("columns" in cfg)) return null;
    const config = cfg as ProjectColumnsConfig;
    const find = (id?: string) => projects.find((p) => String(p.id) === String(id))?.title;
    const titles = [find(config.project_1), config.columns === 2 ? find(config.project_2) : undefined]
      .filter(Boolean) as string[];
    return titles.length > 0 ? titles.join(" · ") : null;
  };

  return (
    <div className="space-y-4">
      <AddBlockMenu
        id={`add-blocks-${pageId}`}
        options={BLOCK_OPTIONS}
        open={showAddMenu}
        onToggle={() => setShowAddMenu(!showAddMenu)}
        onAdd={handleAdd}
      />

      {components.length === 0 && (
        <p className={`${myWebMutedClassName} rounded-[28px] border border-dashed border-[#010000]/20 px-5 py-8 text-center`}>
          No hay componentes. Añade uno para comenzar.
        </p>
      )}

      <div className="space-y-2">
        {components.map((component, index) => (
          <BlockCard
            key={component.id}
            id={component.id}
            label={getComponentLabel(component.type)}
            summary={getProjectColumnsSummary(component)}
            visible={component.visible}
            expanded={expandedId === component.id}
            first={index === 0}
            last={index >= components.length - 1}
            onExpand={() => setExpandedId(expandedId === component.id ? null : component.id)}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            onToggleVisible={() => handleToggleVisible(component)}
            onDelete={() => setDeleteTarget(component.id)}
          >
            {expandedId === component.id && (
              <>
                {isHome && <ComponentAnchorEditor key={`${component.id}:${component.anchor_id ?? ""}`} component={component} />}
                <ComponentEditor component={component} />
              </>
            )}
          </BlockCard>
        ))}
      </div>

      {deleteTarget && (
        <Alert
          title="Eliminar componente"
          disabledConfirmButton={deleteRequest.inProgress}
          description={`¿Estás seguro de que deseas eliminar este componente? Esta acción no se puede deshacer.${deleteRequest.messages && !deleteRequest.ok ? ` ${deleteRequest.messages}` : ""}`}
          onAccept={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
