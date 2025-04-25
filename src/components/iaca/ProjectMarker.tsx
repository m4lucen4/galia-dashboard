import React from "react";
import { Marker as LeafletMarker, Popup } from "react-leaflet";
import { extractCoordinates } from "../../helpers";
import { ProjectDataProps } from "../../types";

interface ProjectMarkerProps {
  project: ProjectDataProps;
}

export const ProjectMarker: React.FC<ProjectMarkerProps> = ({ project }) => {
  if (!project.googleMaps) return null;

  const coords = extractCoordinates(project.googleMaps);
  if (!coords) return null;

  return (
    <LeafletMarker position={[coords.lat, coords.lng]}>
      <Popup>
        <div className="p-2">
          <h3 className="font-bold text-lg text-gray-900">{project.title}</h3>
          <p className="text-sm text-gray-700 mt-1">{project.description}</p>
          <p className="text-sm text-gray-600 mt-1">
            Promotor: {project.promoter || "N/A"}
          </p>
          {project.collaborators && (
            <p className="text-xs text-gray-500 mt-1">
              Colaboradores: {project.collaborators}
            </p>
          )}
          {project.image_data?.[0]?.url && (
            <img
              src={project.image_data[0].url}
              alt={project.title}
              className="mt-3 rounded-md max-h-32 w-auto object-cover"
            />
          )}
          <div className="mt-2">
            <a
              href={project.googleMaps}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              See in Google Maps
            </a>
          </div>
        </div>
      </Popup>
    </LeafletMarker>
  );
};
