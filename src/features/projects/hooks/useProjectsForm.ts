import { useState, useLayoutEffect } from "react";
import {
  ProjectDataProps,
  ProjectImageData,
  ProjectCollaboratorsProps,
  FileItem as FileItemType,
  UserDataProps,
} from "../../../types";
import { CreateProjectProps } from "../../../redux/actions/ProjectActions";
import { ImageItem } from "../../../components/shared/ui/ImageDragList";
import { normalizeUrl } from "../../../helpers";

interface UseProjectsFormProps {
  initialData?: ProjectDataProps;
  user: UserDataProps;
  onSubmit: (project: CreateProjectProps) => void;
}

export const useProjectsForm = ({
  initialData,
  user,
  onSubmit,
}: UseProjectsFormProps) => {
  const defaultFormData: CreateProjectProps = {
    user: user?.uid,
    title: "",
    state: "draft",
    description: "",
    requiredAI: false,
    prompt: "",
    keywords: "",
    weblink: "",
    image_data: [],
    publications: 1,
    googleMaps: "",
    showMap: false,
    projectCollaborators: [],
  };

  const [formData, setFormData] = useState<CreateProjectProps>(
    initialData || defaultFormData,
  );
  const [allImages, setAllImages] = useState<ImageItem[]>([]);

  // Sync initialData prop changes to local state when editing different projects.
  /* eslint-disable */
  useLayoutEffect(() => {
    if (initialData) {
      setFormData(initialData);

      if (initialData.image_data && initialData.image_data.length > 0) {
        const existingImageItems: ImageItem[] = initialData.image_data.map(
          (img, index) => ({
            id: `existing-${index}`,
            type: "existing" as const,
            url: img.url,
            originalIndex: index,
          }),
        );
        setAllImages(existingImageItems);
      } else {
        setAllImages([]);
      }
    }
  }, [initialData]);
  /* eslint-enable */

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleGallerySelect = (selectedFiles: FileItemType[]) => {
    const newImageItems: ImageItem[] = selectedFiles.map((file, index) => ({
      id: `gallery-${file.id}`,
      type: "existing" as const,
      url: file.url,
      originalIndex: allImages.length + index,
    }));

    setAllImages((prev) => [...prev, ...newImageItems]);

    const newImageData: ProjectImageData[] = selectedFiles.map((file) => ({
      url: file.url,
      status: "pending" as const,
    }));

    setFormData((prev) => ({
      ...prev,
      image_data: [...(prev.image_data || []), ...newImageData],
    }));
  };

  const resolveImageData = (img: ImageItem): ProjectImageData => {
    if (initialData?.image_data) {
      const original = initialData.image_data.find((o) => o.url === img.url);
      if (original) return original;
    }
    return { url: img.url, status: "pending" as const };
  };

  const handleRemoveImage = (id: string) => {
    setAllImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);

      if (imageToRemove?.type === "new" && imageToRemove.url) {
        URL.revokeObjectURL(imageToRemove.url);
      }

      const newImages = prev.filter((img) => img.id !== id);

      if (imageToRemove?.type === "existing") {
        const updatedImageData = newImages
          .filter((img) => img.type === "existing")
          .map(resolveImageData);

        setFormData((prevData) => ({
          ...prevData,
          image_data: updatedImageData,
        }));
      }

      return newImages;
    });
  };

  const handleReorderImages = (reorderedImages: ImageItem[]) => {
    setAllImages(reorderedImages);

    const reorderedImageData = reorderedImages
      .filter((img) => img.type === "existing")
      .map(resolveImageData);

    setFormData((prevData) => ({
      ...prevData,
      image_data: reorderedImageData,
    }));
  };

  const handleProjectCollaboratorsChange = (
    collaborators: ProjectCollaboratorsProps[],
  ) => {
    setFormData((prev) => ({ ...prev, projectCollaborators: collaborators }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedWeblink = formData.weblink
      ? normalizeUrl(formData.weblink)
      : "";

    const updatedFormData = {
      ...formData,
      weblink: normalizedWeblink,
      image_data: [...(formData.image_data || [])],
    };

    onSubmit(updatedFormData);
  };

  const totalImagesCount = allImages.length;

  return {
    formData,
    setFormData,
    allImages,
    totalImagesCount,
    handleChange,
    handleSubmit,
    handleGallerySelect,
    handleRemoveImage,
    handleReorderImages,
    handleProjectCollaboratorsChange,
  };
};
