import React, { useEffect, useState, useRef } from "react";
import { InputField } from "../shared/ui/InputField";
import { Button } from "../shared/ui/Button";
import { ProjectDataProps, ProjectImageData, UserProps } from "../../types";
import { CreateProjectProps } from "../../redux/actions/ProjectActions";
import { KeywordInput } from "../shared/ui/KeywordInput";

interface ProjectsFormProps {
  initialData?: ProjectDataProps;
  onSubmit: (project: CreateProjectProps) => void;
  loading: boolean;
  isEditMode?: boolean;
  user: UserProps;
}

export const ProjectsForm: React.FC<ProjectsFormProps> = ({
  initialData,
  onSubmit,
  loading,
  isEditMode = false,
  user,
}) => {
  const defaultFormData: CreateProjectProps = {
    user: user?.uid,
    title: "",
    state: "draft",
    description: "",
    keywords: "",
    weblink: "",
    image_data: [],
  };

  const [formData, setFormData] = useState<CreateProjectProps>(
    initialData || defaultFormData
  );
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ProjectImageData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);

      if (initialData.image_data && initialData.image_data.length > 0) {
        setExistingImages(initialData.image_data);
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (selectedImages.length > 0) {
      const newPreviewUrls: string[] = [];

      selectedImages.forEach((file) => {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push(url);
      });

      setPreviewUrls(newPreviewUrls);

      return () => {
        newPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      };
    }
  }, [selectedImages]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);

      const maxNewImages = 15 - existingImages.length;
      const limitedFiles = filesArray.slice(0, maxNewImages);

      setSelectedImages(limitedFiles);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => {
      const newImages = [...prev];
      newImages.splice(index, 1);

      setFormData((prevData) => ({
        ...prevData,
        image_data: newImages,
      }));

      return newImages;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedFormData = {
      ...formData,
      image_data: [...(formData.image_data || [])],
    };

    const projectDataWithImages: CreateProjectProps = {
      ...updatedFormData,
      images: selectedImages.length > 0 ? selectedImages : undefined,
    };

    onSubmit(projectDataWithImages);
  };

  const totalImagesCount = existingImages.length + selectedImages.length;

  return (
    <form onSubmit={handleSubmit}>
      <div className="col-span-2">
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
          type="textarea"
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
            htmlFor="state"
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
            disabled={user?.role !== "admin"}
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

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Images ({totalImagesCount}/15)
          </label>
          <div className="mt-1 flex items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              id="project-images"
              disabled={existingImages.length >= 15}
            />
            <Button
              title="Select Images"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={existingImages.length >= 15}
            />
            <span className="ml-3 text-sm text-gray-500">
              {selectedImages.length} new images selected
            </span>
          </div>

          {/* Existing Images */}
          {existingImages.length > 0 && (
            <>
              <h4 className="font-medium text-sm mt-4 mb-2">Existing Images</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {existingImages.map((img, index) => (
                  <div key={`existing-${index}`} className="relative group">
                    <img
                      src={img.url}
                      alt={`Existing image ${index}`}
                      className="h-24 w-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Preview images */}
          {previewUrls.length > 0 && (
            <>
              <h4 className="font-medium text-sm mt-4 mb-2">New Images</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={`new-${index}`} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index}`}
                      className="h-24 w-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
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
