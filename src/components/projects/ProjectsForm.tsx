import React, { useEffect, useState } from "react";
import { InputField } from "../shared/ui/InputField";
import { Button } from "../shared/ui/Button";
import { ProjectDataProps, UserDataProps } from "../../types";
import { CreateProjectProps } from "../../redux/actions/ProjectActions";
import { KeywordInput } from "../shared/ui/KeywordInput";

interface ProjectsFormProps {
  initialData?: ProjectDataProps;
  onSubmit: (project: CreateProjectProps) => void;
  loading: boolean;
  isEditMode?: boolean;
  userData: UserDataProps;
}

export const ProjectsForm: React.FC<ProjectsFormProps> = ({
  initialData,
  onSubmit,
  loading,
  isEditMode = false,
  userData,
}) => {
  const defaultFormData: CreateProjectProps = {
    user: userData?.uid,
    title: "",
    state: "draft",
    description: "",
    keywords: "",
    weblink: "",
  };

  const [formData, setFormData] = useState<CreateProjectProps>(
    initialData || defaultFormData
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    console.log("Submitting with user ID:", formData.user);
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="title"
          label="Project Title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          required
        />
        <InputField
          id="description"
          label="Description"
          type="text"
          value={formData.description}
          onChange={handleChange}
          required
        />
        <KeywordInput
          id="keywords"
          label="Keywords"
          value={formData.keywords}
          onChange={(value) => setFormData({ ...formData, keywords: value })}
          required
        />
        <div>
          <label
            htmlFor="role"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            State
          </label>
          <select
            id="state"
            name="state"
            value={formData.state}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={userData?.role !== "admin"}
          >
            <option value="draft">Draft</option>
          </select>
        </div>
        <InputField
          id="weblink"
          label="Web Link"
          placeholder="https://example.com"
          type="url"
          value={formData.weblink || ""}
          onChange={handleChange}
        />
      </div>
      <div className="mt-6">
        <Button
          fullWidth
          title={isEditMode ? "Edit Project" : "Create Project"}
          disabled={loading}
          type="submit"
        />
      </div>
    </form>
  );
};
