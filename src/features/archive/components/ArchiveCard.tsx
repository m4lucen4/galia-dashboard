import type { ArchivePhoto } from "../../../redux/actions/ArchiveActions";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function photoUrl(photo: ArchivePhoto, token: string, size = "baja_ma"): string {
  return `${SUPABASE_URL}/functions/v1/serve-photo?id=${photo.id}&size=${size}&token=${token}`;
}

interface ArchiveCardProps {
  photo: ArchivePhoto;
  token: string;
  onClick: () => void;
}

export function ArchiveCard({ photo, token, onClick }: ArchiveCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded-xl"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-xl bg-gray-100 aspect-[4/3] border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow duration-300">
        <img
          src={photoUrl(photo, token)}
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
