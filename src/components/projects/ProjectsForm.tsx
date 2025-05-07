import React, { useEffect, useState, useRef } from "react";
import { InputField } from "../shared/ui/InputField";
import { Button } from "../shared/ui/Button";
import { ProjectDataProps, ProjectImageData, UserDataProps } from "../../types";
import { CreateProjectProps } from "../../redux/actions/ProjectActions";
import { KeywordInput } from "../shared/ui/KeywordInput";
import { SelectField } from "../shared/ui/SelectField";
import { CancelIcon } from "../icons";

interface ProjectsFormProps {
  initialData?: ProjectDataProps;
  onSubmit: (project: CreateProjectProps) => void;
  loading: boolean;
  isEditMode?: boolean;
  user: UserDataProps;
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
    publications: 1,
    googleMaps: "",
    promoter: "",
    collaborators: "",
    authors: "",
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
        <div className="mb-2">
          <InputField
            id="title"
            label="Project Title"
            placeholder="Enter project title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-2">
          <InputField
            id="description"
            label="Description"
            type="textarea"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="requiredAI"
            name="requiredAI"
            checked={formData.requiredAI}
            onChange={handleChange}
            className="h-4 w-4 text-black focus:ring-gray-400 border-gray-300 rounded"
          />
          <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
            Do you want to use AI for this project? Check yes to enable
          </label>
        </div>
        <div className="mb-2">
          <KeywordInput
            id="keywords"
            label="Keywords (optional)"
            value={formData.keywords || ""}
            onChange={(value) => setFormData({ ...formData, keywords: value })}
          />
        </div>
        <div className="mb-2">
          <InputField
            id="weblink"
            label="Web Link (optional)"
            placeholder="https://example.com"
            type="url"
            value={formData.weblink || ""}
            onChange={handleChange}
          />
        </div>
        <div className="col-span-2 mb-2">
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
                      <CancelIcon />
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
                      <CancelIcon />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="my-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How many publications do you want to create?
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, publications: value })
                  }
                  className={`flex-1 py-2 rounded-md transition-colors ${
                    formData.publications === value
                      ? "bg-black text-white font-medium"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-2">
            <InputField
              id="googleMaps"
              label="Google Maps Link (optional)"
              placeholder="Introduce your project location, google maps link complete"
              type="url"
              value={formData.googleMaps || ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex space-x-4 mb-2">
            <div className="flex-1">
              <SelectField
                id="category"
                label="Category (optional)"
                value={formData.category || ""}
                onChange={handleChange}
                options={[
                  { value: "residencial", label: "Residencial" },
                  { value: "docente", label: "Docente" },
                  { value: "oficinas", label: "Oficinas" },
                  { value: "planeamiento", label: "Planeamiento" },
                  { value: "cultural", label: "Cultural" },
                  { value: "publico", label: "Espacio público" },
                  { value: "rehabilitacion", label: "Rehabilitación" },
                  { value: "interiorismo", label: "Interiorismo" },
                  { value: "sanitario", label: "Sanitario" },
                ]}
              />
            </div>
            <div className="flex-1">
              <InputField
                id="year"
                label="Year (optional)"
                placeholder="Building year"
                type="number"
                value={formData.year || ""}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="mb-2">
            <InputField
              id="authors"
              label="Authors (optional)"
              placeholder="Authors name"
              type="text"
              value={formData.authors || ""}
              onChange={handleChange}
            />
          </div>
          <div className="mb-2">
            <InputField
              id="promoter"
              label="Promoter (optional)"
              placeholder="Promoter name"
              type="text"
              value={formData.promoter || ""}
              onChange={handleChange}
            />
          </div>
          <div className="mb-2">
            <InputField
              id="collaborators"
              label="Collaborators (optional)"
              placeholder="Collaborators names"
              type="text"
              value={formData.collaborators || ""}
              onChange={handleChange}
            />
          </div>
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
