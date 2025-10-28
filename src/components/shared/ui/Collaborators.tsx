import React from "react";
import { useTranslation } from "react-i18next";
import { InputField } from "./InputField";
import { Button } from "./Button";
import { AddIcon } from "../../icons/AddIcon";
import { DeleteIcon } from "../../icons/DeleteIcon";
import { ProjectCollaboratorsProps } from "../../../types";
import { SelectField } from "./SelectField";
import { normalizeUrl } from "../../../helpers";

interface CollaboratorsProps {
  collaborators: ProjectCollaboratorsProps[];
  onChange: (collaborators: ProjectCollaboratorsProps[]) => void;
  label?: string;
}

export const Collaborators: React.FC<CollaboratorsProps> = ({
  collaborators,
  onChange,
  label,
}) => {
  const { t } = useTranslation();

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
    value: string
  ) => {
    const updatedCollaborators = collaborators.map((collaborator, i) =>
      i === index ? { ...collaborator, [field]: value } : collaborator
    );
    onChange(updatedCollaborators);
  };

  const handleWebsiteBlur = (index: number, value: string) => {
    // Normalize URL when user finishes editing
    const normalizedValue = value ? normalizeUrl(value) : value;
    const updatedCollaborators = collaborators.map((collaborator, i) =>
      i === index ? { ...collaborator, website: normalizedValue } : collaborator
    );
    onChange(updatedCollaborators);
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
        <div className="space-y-4">
          {collaborators.map((collaborator, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  {t("projects.collaborator")} {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCollaborator(index)}
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
                    onChange={(e) =>
                      updateCollaborator(index, "profession", e.target.value)
                    }
                    options={[
                      { value: "autor", label: "Autor" },
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
                    onChange={(e) =>
                      updateCollaborator(index, "name", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label
                    className="text-base text-sm text-black"
                    htmlFor={`website-${index}`}
                  >
                    {t("projects.website")}
                  </label>
                  <input
                    id={`website-${index}`}
                    name={`website-${index}`}
                    placeholder="https://example.com"
                    type="url"
                    value={collaborator.website || ""}
                    onChange={(e) =>
                      updateCollaborator(index, "website", e.target.value)
                    }
                    onBlur={(e) => handleWebsiteBlur(index, e.target.value)}
                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-gray-800 sm:text-sm/6"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
