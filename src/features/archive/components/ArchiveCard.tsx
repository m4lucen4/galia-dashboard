import type { ArchivePhoto } from "../../../redux/actions/ArchiveActions";

const NAS_URL = import.meta.env.VITE_NAS_PROXY_URL;
const NAS_KEY = import.meta.env.VITE_NAS_PROXY_API_KEY;

export function thumbnailUrl(photo: ArchivePhoto): string {
  const path = `/${photo.nas_base_path}/${photo.project_id}_baja_ma/${photo.filename}`;
  return `${NAS_URL}/serve?path=${encodeURIComponent(path)}&apikey=${NAS_KEY}`;
}

export function mediumUrl(photo: ArchivePhoto): string {
  const path = `/${photo.nas_base_path}/${photo.project_id}_baja_ma/${photo.filename}`;
  return `${NAS_URL}/serve?path=${encodeURIComponent(path)}&apikey=${NAS_KEY}`;
}

interface ArchiveCardProps {
  photo: ArchivePhoto;
  onClick: () => void;
}

export function ArchiveCard({ photo, onClick }: ArchiveCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded-xl"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-xl bg-gray-100 aspect-[4/3] border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
        <img
          src={thumbnailUrl(photo)}
          alt={photo.filename}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>

      {/* Metadata */}
      <div className="pt-3 px-0.5">
        <p className="text-gray-900 text-sm font-semibold leading-snug line-clamp-2">
          {photo.project_title}
        </p>
        {photo.description && (
          <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">
            {photo.description}
          </p>
        )}
        <p className="text-gray-400 text-xs mt-1.5">
          {photo.author_first_name} {photo.author_last_name}
          {photo.project_category && (
            <>
              {" "}
              <span className="text-gray-300">·</span>{" "}
              <span className="capitalize">{photo.project_category}</span>
            </>
          )}
        </p>
      </div>
    </button>
  );
}
