import React, { useState } from "react";
import { SiteComponentDataProps, SiteComponentType } from "../../../types";
import { ComponentEditor } from "./ComponentEditor";
import { useAppDispatch } from "../../../redux/hooks";
import {
  addSiteComponent,
  deleteSiteComponent,
  updateSiteComponent,
  reorderSiteComponents,
} from "../../../redux/actions/SiteComponentActions";
import { Button } from "../../../components/shared/ui/Button";
import { Alert } from "../../../components/shared/ui/Alert";
import {
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface ComponentListProps {
  pageId: string;
  components: SiteComponentDataProps[];
}

const COMPONENT_TYPES: { type: SiteComponentType; label: string; description?: string }[] = [
  { type: "header", label: "Header" },
  { type: "cta", label: "CTA" },
  { type: "body", label: "Body", description: "Bloque de imágenes con texto descriptivo" },
  { type: "content", label: "Contenido", description: "Título, columnas de texto y datos estadísticos" },
  { type: "contact", label: "Contacto", description: "Información de contacto y dirección" },
];

export const ComponentList: React.FC<ComponentListProps> = ({
  pageId,
  components,
}) => {
  const dispatch = useAppDispatch();
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const handleDelete = () => {
    if (deleteTarget) {
      dispatch(deleteSiteComponent(deleteTarget));
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
    const found = COMPONENT_TYPES.find((ct) => ct.type === type);
    return found ? found.label : type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Componentes</h3>
        <div className="relative">
          <Button
            title="Añadir componente"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setShowAddMenu(!showAddMenu)}
            secondary
          />
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
              {COMPONENT_TYPES.map((ct) => (
                <button
                  key={ct.type}
                  onClick={() => handleAdd(ct.type)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {ct.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {components.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">
          No hay componentes. Añade uno para comenzar.
        </p>
      )}

      <div className="space-y-2">
        {components.map((component, index) => (
          <div
            key={component.id}
            className="border border-gray-200 rounded-md bg-white"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <button
                className="flex items-center gap-2 flex-1 text-left"
                onClick={() =>
                  setExpandedId(
                    expandedId === component.id ? null : component.id,
                  )
                }
              >
                <ChevronRightIcon
                  className={`h-4 w-4 text-gray-500 transition-transform ${
                    expandedId === component.id ? "rotate-90" : ""
                  }`}
                />
                <span className="text-sm font-medium text-gray-900">
                  {getComponentLabel(component.type)}
                </span>
                {!component.visible && (
                  <span className="text-xs text-gray-400 ml-1">(oculto)</span>
                )}
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index >= components.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleVisible(component)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {component.visible ? (
                    <EyeIcon className="h-4 w-4" />
                  ) : (
                    <EyeSlashIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setDeleteTarget(component.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {expandedId === component.id && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                <ComponentEditor component={component} />
              </div>
            )}
          </div>
        ))}
      </div>

      {deleteTarget && (
        <Alert
          title="Eliminar componente"
          description="¿Estás seguro de que deseas eliminar este componente? Esta acción no se puede deshacer."
          onAccept={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
