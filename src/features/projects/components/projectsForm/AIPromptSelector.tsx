import React from "react";
import { useTranslation } from "react-i18next";
import { SelectField } from "../../../../components/shared/ui/SelectField";
import { Checkbox } from "../../../../components/shared/ui/Checkbox";
import { projectCheckboxClassName, projectControlClassName } from "../projectFormStyles";

interface PromptOption {
  title: string;
  description: string;
}

interface AIPromptSelectorProps {
  requiredAI: boolean;
  prompt: string;
  prompts: PromptOption[];
  onAIChange: (checked: boolean) => void;
  onPromptChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const AIPromptSelector: React.FC<AIPromptSelectorProps> = ({
  requiredAI,
  prompt,
  prompts,
  onAIChange,
  onPromptChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="min-w-0 space-y-3">
      <Checkbox
        id="requiredAI"
        label={t("projects.requiredAI")}
        checked={requiredAI}
        onChange={onAIChange}
        className={projectCheckboxClassName}
      />

      {requiredAI && (
        <div className="min-w-0">
          <SelectField
            id="prompt"
            className={projectControlClassName}
            label={t("projects.selectPrompt")}
            value={prompt}
            onChange={onPromptChange}
            options={[
              { value: "", label: t("projects.selectPromptOption") },
              ...prompts.map((p) => ({
                value: p.description,
                label: p.title,
              })),
            ]}
          />
        </div>
      )}
    </div>
  );
};
