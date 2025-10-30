import React from "react";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CancelIcon } from "../../icons";

export interface ImageItem {
  id: string;
  type: "existing" | "new";
  url: string;
  file?: File;
  originalIndex?: number;
}

interface SortableImageItemProps {
  image: ImageItem;
  onRemove: (id: string) => void;
}

const SortableImageItem: React.FC<SortableImageItemProps> = ({
  image,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative group cursor-move ${isDragging ? "z-50" : ""}`}
    >
      <img
        src={image.url}
        alt={`Image ${image.id}`}
        className="h-24 w-full object-cover rounded-md border-2 border-gray-200 hover:border-gray-300 transition-colors"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(image.id);
        }}
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <CancelIcon />
      </button>
      {/* Indicador visual de drag */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-20 transition-opacity">
        <div className="bg-black text-white px-2 py-1 rounded text-xs">
          Arrastrar
        </div>
      </div>
    </div>
  );
};

interface ImageDragListProps {
  images: ImageItem[];
  onReorder: (images: ImageItem[]) => void;
  onRemove: (id: string) => void;
  maxImages?: number;
}

export const ImageDragList: React.FC<ImageDragListProps> = ({
  images,
  onReorder,
  onRemove,
  maxImages = 10,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((image) => image.id === active.id);
      const newIndex = images.findIndex((image) => image.id === over.id);

      const reorderedImages = arrayMove(images, oldIndex, newIndex);
      onReorder(reorderedImages);
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">
          Imágenes ({images.length}/{maxImages})
        </h4>
        <div className="text-xs text-gray-500">Arrastra para reordenar</div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={images.map((img) => img.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <SortableImageItem
                key={image.id}
                image={image}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
