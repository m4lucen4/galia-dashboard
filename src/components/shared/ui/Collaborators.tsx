import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { AddIcon } from "../../icons/AddIcon";
import { DeleteIcon } from "../../icons/DeleteIcon";
import { ProjectCollaboratorsProps } from "../../../types";
import { SelectField } from "./SelectField";
import { normalizeUrl } from "../../../helpers";
import { supabase } from "../../../helpers/supabase";
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
  onContactSelect: (index: number, contact: OdooContact) => void;
  onNameFocus: () => void;
  odooContacts: OdooContact[];
  isLoadingOdooContacts: boolean;
  odooContactsError: boolean;
  isOdooContactsIncomplete: boolean;
}

interface OdooContact {
  id: number;
  name: string;
}

interface OdooContactsResponse {
  status: "complete" | "incomplete";
  contacts: OdooContact[];
  pagination: {
    order: "id asc";
    pageSize: number;
    maxContacts: number;
    pages: number;
  };
}

const isOdooContactsResponse = (value: unknown): value is OdooContactsResponse => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const response = value as {
    status?: unknown;
    contacts?: unknown;
    pagination?: unknown;
  };

  if (
    (response.status !== "complete" && response.status !== "incomplete") ||
    !Array.isArray(response.contacts) ||
    !response.contacts.every(
      (contact) =>
        contact &&
        typeof contact === "object" &&
        !Array.isArray(contact) &&
        Number.isSafeInteger((contact as { id?: unknown }).id) &&
        (contact as { id: number }).id > 0 &&
        typeof (contact as { name?: unknown }).name === "string",
    ) ||
    !response.pagination ||
    typeof response.pagination !== "object" ||
    Array.isArray(response.pagination)
  ) {
    return false;
  }

  const pagination = response.pagination as {
    order?: unknown;
    pageSize?: unknown;
    maxContacts?: unknown;
    pages?: unknown;
  };

  return (
    pagination.order === "id asc" &&
    typeof pagination.pageSize === "number" &&
    Number.isSafeInteger(pagination.pageSize) &&
    pagination.pageSize > 0 &&
    typeof pagination.maxContacts === "number" &&
    Number.isSafeInteger(pagination.maxContacts) &&
    pagination.maxContacts > 0 &&
    typeof pagination.pages === "number" &&
    Number.isSafeInteger(pagination.pages) &&
    pagination.pages > 0
  );
};

const minimumSearchLength = 3;
const maximumSuggestions = 10;

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();

const SortableCollaboratorItem: React.FC<SortableCollaboratorItemProps> = ({
  collaborator,
  index,
  id,
  onRemove,
  onUpdate,
  onWebsiteBlur,
  onContactSelect,
  onNameFocus,
  odooContacts,
  isLoadingOdooContacts,
  odooContactsError,
  isOdooContactsIncomplete,
}) => {
  const { t } = useTranslation();
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
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

  const normalizedName = normalizeSearchText(collaborator.name);
  const suggestions = useMemo(
    () =>
      normalizedName.length >= minimumSearchLength
        ? odooContacts
            .filter((contact) =>
              normalizeSearchText(contact.name).includes(normalizedName),
            )
            .slice(0, maximumSuggestions)
        : [],
    [normalizedName, odooContacts],
  );
  const shouldShowSuggestions =
    isSuggestionsOpen && collaborator.name.length >= minimumSearchLength;
  const activeSuggestion =
    activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length
      ? suggestions[activeSuggestionIndex]
      : undefined;
  const contactFeedback = isLoadingOdooContacts
    ? "Cargando contactos de Odoo…"
    : odooContactsError
      ? "No se han podido cargar los contactos de Odoo. Puedes escribir el nombre manualmente."
      : isOdooContactsIncomplete
        ? "La lista de Odoo está incompleta; puede haber más coincidencias."
        : null;

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(index, "name", event.target.value);
    setIsSuggestionsOpen(event.target.value.length >= minimumSearchLength);
    setActiveSuggestionIndex(-1);
  };

  const selectContact = (contact: OdooContact) => {
    onContactSelect(index, contact);
    setIsSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!shouldShowSuggestions || suggestions.length === 0) {
      if (event.key === "Escape") setIsSuggestionsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((currentIndex) =>
        currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((currentIndex) =>
        currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1,
      );
    } else if (event.key === "Enter" && activeSuggestion) {
      event.preventDefault();
      selectContact(activeSuggestion);
    } else if (event.key === "Escape") {
      setIsSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
    }
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
          <div
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsSuggestionsOpen(false);
                setActiveSuggestionIndex(-1);
              }
            }}
          >
            <label className="text-sm text-black" htmlFor={`name-${index}`}>
              {t("projects.collaboratorName")}
              <span className="ml-1 text-blue-600 font-medium">*</span>
            </label>
            <input
              id={`name-${index}`}
              name={`name-${index}`}
              placeholder={t("projects.collaboratorNamePlaceholder")}
              type="text"
              value={collaborator.name}
              onChange={handleNameChange}
              onFocus={() => {
                void onNameFocus();
                if (collaborator.name.length >= minimumSearchLength) {
                  setIsSuggestionsOpen(true);
                }
              }}
              onKeyDown={handleNameKeyDown}
              required
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-controls={`name-suggestions-${index}`}
              aria-expanded={shouldShowSuggestions}
              aria-activedescendant={
                activeSuggestion
                  ? `name-suggestion-${index}-${activeSuggestion.id}`
                  : undefined
              }
              className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 sm:text-sm/6"
            />
            {shouldShowSuggestions && (
              <ul
                id={`name-suggestions-${index}`}
                role="listbox"
                className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
              >
                {!isLoadingOdooContacts &&
                !odooContactsError &&
                suggestions.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-gray-500">
                    {isOdooContactsIncomplete
                      ? "No hay coincidencias en la parte disponible de Odoo"
                      : "No hay coincidencias"}
                  </li>
                ) : !isLoadingOdooContacts && !odooContactsError ? (
                  suggestions.map((contact, suggestionIndex) => (
                    <li key={contact.id}>
                      <button
                        id={`name-suggestion-${index}-${contact.id}`}
                        type="button"
                        role="option"
                        aria-selected={activeSuggestionIndex === suggestionIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectContact(contact)}
                        className={`w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 ${activeSuggestionIndex === suggestionIndex ? "bg-gray-100" : ""}`}
                      >
                        {contact.name}
                      </button>
                    </li>
                  ))
                ) : null}
              </ul>
            )}
            {contactFeedback && (
              <p className="mt-1 text-xs text-gray-500">{contactFeedback}</p>
            )}
          </div>
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
  const [odooContacts, setOdooContacts] = useState<OdooContact[]>([]);
  const [isLoadingOdooContacts, setIsLoadingOdooContacts] = useState(false);
  const [odooContactsError, setOdooContactsError] = useState(false);
  const [isOdooContactsIncomplete, setIsOdooContactsIncomplete] =
    useState(false);
  const odooContactsRequestId = useRef(0);
  const odooContactsLoadPromise = useRef<Promise<void> | null>(null);
  const hasLoadedOdooContacts = useRef(false);

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
      id: crypto.randomUUID(),
      profession: "",
      name: "",
      website: "",
    };
    onChange([...collaborators, newCollaborator]);
    void loadOdooContacts();
  };

  const loadOdooContacts = () => {
    if (odooContactsLoadPromise.current) {
      return odooContactsLoadPromise.current;
    }

    if (hasLoadedOdooContacts.current) {
      return Promise.resolve();
    }

    const requestId = odooContactsRequestId.current + 1;
    odooContactsRequestId.current = requestId;
    setIsLoadingOdooContacts(true);
    setOdooContactsError(false);
    setOdooContacts([]);
    setIsOdooContactsIncomplete(false);

    const loadPromise = (async () => {
      try {
        const { data, error } =
          await supabase.functions.invoke<OdooContactsResponse>(
            "odoo-contacts",
            {
              body: {},
            },
          );

        if (requestId !== odooContactsRequestId.current) return;

        if (error || !isOdooContactsResponse(data)) {
          console.error("Unable to load Odoo contacts");
          setOdooContacts([]);
          setIsOdooContactsIncomplete(false);
          setOdooContactsError(true);
          return;
        }

        hasLoadedOdooContacts.current = true;
        setOdooContacts(data.contacts);
        setIsOdooContactsIncomplete(data.status === "incomplete");

        if (data.status === "incomplete") {
          console.warn(
            "Odoo contact list is incomplete because the result cap was reached",
            {
              maxContacts: data.pagination.maxContacts,
            },
          );
        }
      } catch {
        if (requestId !== odooContactsRequestId.current) return;

        console.error("Unable to load Odoo contacts");
        setOdooContacts([]);
        setIsOdooContactsIncomplete(false);
        setOdooContactsError(true);
      } finally {
        if (requestId === odooContactsRequestId.current) {
          setIsLoadingOdooContacts(false);
        }

        if (requestId === odooContactsRequestId.current) {
          odooContactsLoadPromise.current = null;
        }
      }
    })();

    odooContactsLoadPromise.current = loadPromise;
    return loadPromise;
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
    const updatedCollaborators = collaborators.map((collaborator, i) => {
      if (i !== index) return collaborator;

      if (field === "name" && value !== collaborator.name) {
        const { odooId, ...collaboratorWithoutOdooId } = collaborator;
        void odooId;
        return { ...collaboratorWithoutOdooId, name: value };
      }

      return { ...collaborator, [field]: value };
    });
    onChange(updatedCollaborators);
  };

  const selectOdooContact = (index: number, contact: OdooContact) => {
    const updatedCollaborators = collaborators.map((collaborator, i) =>
      i === index
        ? { ...collaborator, name: contact.name, odooId: contact.id }
        : collaborator,
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
        (collaborator) => collaborator.id === active.id,
      );
      const newIndex = collaborators.findIndex(
        (collaborator) => collaborator.id === over.id,
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
              items={collaborators.map((collaborator) => collaborator.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {collaborators.map((collaborator, index) => (
                  <SortableCollaboratorItem
                    key={collaborator.id}
                    id={collaborator.id}
                    collaborator={collaborator}
                    index={index}
                    onRemove={removeCollaborator}
                    onUpdate={updateCollaborator}
                    onWebsiteBlur={handleWebsiteBlur}
                    onContactSelect={selectOdooContact}
                    onNameFocus={loadOdooContacts}
                    odooContacts={odooContacts}
                    isLoadingOdooContacts={isLoadingOdooContacts}
                    odooContactsError={odooContactsError}
                    isOdooContactsIncomplete={isOdooContactsIncomplete}
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
