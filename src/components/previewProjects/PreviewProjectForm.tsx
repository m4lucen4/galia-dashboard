import { useState, useEffect } from "react";
import { useAppDispatch } from "../../redux/hooks";
import { updatePreviewProject } from "../../redux/actions/PreviewProjectActions";
import { PreviewProjectDataProps, ProjectImageData } from "../../types";
import { InputField } from "../shared/ui/InputField";
import { Button } from "../shared/ui/Button";

type PreviewProjectFormProps = {
  project: PreviewProjectDataProps;
  loading: boolean;
  onSave: () => void;
};

export const PreviewProjectForm = ({
  project,
  loading,
  onSave,
}: PreviewProjectFormProps) => {
  const dispatch = useAppDispatch();
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ProjectImageData[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (project) {
      setDescription(project.description_rich || "");
      setImages(project.image_data || []);
    }
  }, [project]);

  const handleToggleImageSelection = (imageUrl: string) => {
    setImages((currentImages) =>
      currentImages.map((img) => {
        if (img.url === imageUrl) {
          const newStatus =
            img.status === "pending" ? "not_selected" : "pending";
          return {
            ...img,
            status: newStatus,
          };
        }
        return img;
      })
    );
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", index.toString());
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];

    // Remove the element from its original position
    newImages.splice(draggedIndex, 1);

    // Insert new position
    newImages.splice(dropIndex, 0, draggedImage);

    setImages(newImages);
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    await dispatch(
      updatePreviewProject({
        projectId: project.id,
        description_rich: description,
        image_data: images,
      })
    ).unwrap();
    onSave();
  };

  return (
    <div className="space-y-6">
      <InputField
        id="description"
        label="Description"
        type="textarea"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Project Images
        </h4>
        <p className="text-xs text-gray-500 mb-3">
          Select the images you want to include in the project. Unselected
          images will not appear in posts. Drag and drop to reorder the
          publication sequence.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className={`relative border rounded-md overflow-hidden cursor-move transition-all duration-200 ${
                draggedIndex === index
                  ? "opacity-50 scale-95 shadow-lg"
                  : "hover:shadow-md"
              }`}
              style={{ height: "180px" }}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              {/* Indicador de orden */}
              <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10">
                {index + 1}
              </div>

              {/* Icono de drag */}
              <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white p-1 rounded z-10">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  <path d="M6 6a2 2 0 110-4 2 2 0 010 4zM6 12a2 2 0 110-4 2 2 0 010 4zM6 18a2 2 0 110-4 2 2 0 010 4z" />
                  <path d="M14 6a2 2 0 110-4 2 2 0 010 4zM14 12a2 2 0 110-4 2 2 0 010 4zM14 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </div>

              <img
                src={image.url}
                alt={`Imagen ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error(`Error cargando imagen: ${image.url}`);
                  e.currentTarget.src =
                    "https://via.placeholder.com/150?text=Error";
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 py-2 px-2">
                <label className="flex items-center justify-between text-white cursor-pointer">
                  <span className="text-xs">
                    {image.status === "pending" ? "Selected" : "Not Selected"}
                  </span>
                  <input
                    type="checkbox"
                    checked={image.status === "pending"}
                    onChange={() => handleToggleImageSelection(image.url)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Button
          fullWidth
          title={loading ? "Saving..." : "Edit Preview project"}
          disabled={loading}
          onClick={handleSave}
        />
      </div>
    </div>
  );
};
