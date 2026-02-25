import React from "react";
import { useTranslation } from "react-i18next";
import { SelectField } from "../../../../components/shared/ui/SelectField";

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
    <>
      <div className="flex items-center mb-2">
        <input
          type="checkbox"
          id="requiredAI"
          name="requiredAI"
          checked={requiredAI}
          onChange={(e) => onAIChange(e.target.checked)}
          className="h-4 w-4 text-black focus:ring-gray-400 border-gray-300 rounded"
        />
        <label
          htmlFor="requiredAI"
          className="ml-2 block text-sm text-gray-700"
        >
          {t("projects.requiredAI")}
        </label>
      </div>

      {requiredAI && (
        <div className="flex items-center mb-2">
          <SelectField
            id="prompt"
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
    </>
  );
};
