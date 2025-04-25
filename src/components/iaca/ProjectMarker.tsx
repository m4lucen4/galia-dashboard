import React from "react";
import { Marker as LeafletMarker } from "react-leaflet";
import { extractCoordinates } from "../../helpers";
import { ProjectDataProps } from "../../types";
import L from "leaflet";

interface ProjectMarkerProps {
  project: ProjectDataProps;
  onSelect: () => void;
  isSelected?: boolean;
}

export const ProjectMarker: React.FC<ProjectMarkerProps> = ({
  project,
  onSelect,
  isSelected = false,
}) => {
  if (!project.googleMaps) return null;

  const coords = extractCoordinates(project.googleMaps);
  if (!coords) return null;

  const defaultIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const selectedIcon = new L.Icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    iconRetinaUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  return (
    <LeafletMarker
      position={[coords.lat, coords.lng]}
      icon={isSelected ? selectedIcon : defaultIcon}
      eventHandlers={{
        click: () => {
          onSelect();
        },
      }}
    />
  );
};
