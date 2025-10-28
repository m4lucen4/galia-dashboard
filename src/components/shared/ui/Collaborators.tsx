import React from "react";
import { useTranslation } from "react-i18next";
import { InputField } from "./InputField";
import { Button } from "./Button";
import { AddIcon } from "../../icons/AddIcon";
import { DeleteIcon } from "../../icons/DeleteIcon";
import { ProjectCollaboratorsProps } from "../../../types";
import { SelectField } from "./SelectField";

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
                      { value: "promotor", label: "Promotor" },
                      { value: "fotografo", label: "Fotógrafo" },
                      { value: "colaborador", label: "Colaborador" },
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
                  <InputField
                    id={`website-${index}`}
                    label={t("projects.website")}
                    placeholder="https://example.com"
                    type="url"
                    value={collaborator.website || ""}
                    onChange={(e) =>
                      updateCollaborator(index, "website", e.target.value)
                    }
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
