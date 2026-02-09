import React from "react";
import { useTranslation } from "react-i18next";
import { InputField } from "./InputField";
import { Button } from "./Button";
import { AddIcon } from "../../icons/AddIcon";
import { DeleteIcon } from "../../icons/DeleteIcon";
import { ProjectCollaboratorsProps } from "../../../types";
import { SelectField } from "./SelectField";
import { normalizeUrl } from "../../../helpers";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CollaboratorsProps {
  collaborators: ProjectCollaboratorsProps[];
  onChange: (collaborators: ProjectCollaboratorsProps[]) => void;
  label?: string;
}

interface SortableCollaboratorItemProps {
  collaborator: ProjectCollaboratorsProps;
  index: number;
  id: string;
  onRemove: (index: number) => void;
  onUpdate: (
    index: number,
    field: keyof ProjectCollaboratorsProps,
    value: string,
  ) => void;
  onWebsiteBlur: (index: number, value: string) => void;
}

const SortableCollaboratorItem: React.FC<SortableCollaboratorItemProps> = ({
  collaborator,
  index,
  id,
  onRemove,
  onUpdate,
  onWebsiteBlur,
}) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`border border-gray-200 rounded-lg p-4 bg-gray-50 hover:border-gray-300 transition-colors ${isDragging ? "z-50" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Arrastrar para reordenar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-700">
            {t("projects.collaborator")} {index + 1}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="text-red-500 hover:text-red-700 transition-colors"
          title={t("projects.removeCollaborator")}
        >
          <DeleteIcon />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <SelectField
            id={`profession-${index}`}
            label={t("projects.profession")}
            value={collaborator.profession}
            onChange={(e) => onUpdate(index, "profession", e.target.value)}
            options={[
              { value: "default", label: "Seleccione una opción" },
              { value: "autor", label: "Autor" },
              {
                value: "arquitectotecnico",
                label: "Arquitecto técnico",
              },
              {
                value: "carpinteriamadera",
                label: "Carpintería en madera",
              },
              {
                value: "carpinteriametalica",
                label: "Carpintería metálica",
              },
              { value: "colaborador", label: "Colaborador" },
              { value: "bim", label: "Consultoría BIM" },
              { value: "constructora", label: "Constructora" },
              { value: "estructuras", label: "Estructuras" },
              { value: "fotografo", label: "Fotógrafo" },
              { value: "identidadvisual", label: "Identidad Visual" },
              { value: "iluminacion", label: "Iluminación" },
              { value: "instalaciones", label: "Instalaciones" },
              { value: "interiorismo", label: "Interiorismo" },
              { value: "promotor", label: "Promotor" },
            ]}
          />
        </div>
        <div>
          <InputField
            id={`name-${index}`}
            label={t("projects.collaboratorName")}
            placeholder={t("projects.collaboratorNamePlaceholder")}
            type="text"
            value={collaborator.name}
            onChange={(e) => onUpdate(index, "name", e.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-black" htmlFor={`website-${index}`}>
            {t("projects.website")}
          </label>
          <input
            id={`website-${index}`}
            name={`website-${index}`}
            placeholder="https://example.com"
            type="url"
            value={collaborator.website || ""}
            onChange={(e) => onUpdate(index, "website", e.target.value)}
            onBlur={(e) => onWebsiteBlur(index, e.target.value)}
            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 sm:text-sm/6"
          />
        </div>
      </div>
    </div>
  );
};

export const Collaborators: React.FC<CollaboratorsProps> = ({
  collaborators,
  onChange,
  label,
}) => {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const addCollaborator = () => {
    const newCollaborator: ProjectCollaboratorsProps = {
      profession: "",
      name: "",
      website: "",
    };
    onChange([...collaborators, newCollaborator]);
  };

  const removeCollaborator = (index: number) => {
    const updatedCollaborators = collaborators.filter((_, i) => i !== index);
    onChange(updatedCollaborators);
  };

  const updateCollaborator = (
    index: number,
    field: keyof ProjectCollaboratorsProps,
    value: string,
  ) => {
    const updatedCollaborators = collaborators.map((collaborator, i) =>
      i === index ? { ...collaborator, [field]: value } : collaborator,
    );
    onChange(updatedCollaborators);
  };

  const handleWebsiteBlur = (index: number, value: string) => {
    // Normalize URL when user finishes editing
    const normalizedValue = value ? normalizeUrl(value) : value;
    const updatedCollaborators = collaborators.map((collaborator, i) =>
      i === index
        ? { ...collaborator, website: normalizedValue }
        : collaborator,
    );
    onChange(updatedCollaborators);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = collaborators.findIndex(
        (_, idx) => `collaborator-${idx}` === active.id,
      );
      const newIndex = collaborators.findIndex(
        (_, idx) => `collaborator-${idx}` === over.id,
      );

      const reorderedCollaborators = arrayMove(
        collaborators,
        oldIndex,
        newIndex,
      );
      onChange(reorderedCollaborators);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          {label || t("projects.collaborators")}
        </label>
        <Button
          type="button"
          onClick={addCollaborator}
          title={t("projects.addCollaborator")}
          icon={<AddIcon />}
          secondary
        />
      </div>

      {collaborators.length === 0 ? (
        <div className="text-sm text-gray-500 italic">
          {t("projects.noCollaborators")}
        </div>
      ) : (
        <div>
          <div className="text-xs text-gray-500 mb-2">
            Arrastra para reordenar
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={collaborators.map((_, idx) => `collaborator-${idx}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {collaborators.map((collaborator, index) => (
                  <SortableCollaboratorItem
                    key={`collaborator-${index}`}
                    id={`collaborator-${index}`}
                    collaborator={collaborator}
                    index={index}
                    onRemove={removeCollaborator}
                    onUpdate={updateCollaborator}
                    onWebsiteBlur={handleWebsiteBlur}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};
