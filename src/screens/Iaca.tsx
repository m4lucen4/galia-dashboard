import { useEffect, useState, useRef } from "react";
import { fetchProjectsWithGoogleMaps } from "../redux/actions/ProjectActions";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { LoadingSpinner } from "../components/shared/ui/LoadingSpinner";
import { Coordinates, ProjectDataProps } from "../types";
import { extractCoordinates } from "../helpers";
import { Button } from "../components/shared/ui/Button";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ProjectMarker } from "../components/iaca/ProjectMarker";
import { ProjectDetail } from "../components/iaca/ProjectDetail";
import { ProjectsGallery } from "../components/iaca/ProjectsGallery";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface IconDefaultPrototype extends L.Icon.Default {
  _getIconUrl?: () => string;
}

function MapCenterUpdater({ center }: { center: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center, map]);
  return null;
}

delete (L.Icon.Default.prototype as IconDefaultPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

export const Iaca = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({
    lat: 37.5443,
    lng: -4.7278,
  });
  const [selectedProject, setSelectedProject] =
    useState<ProjectDataProps | null>(null);

  const { projectFetchWithGoogleMapsRequest, projects } = useAppSelector(
    (state: RootState) => state.project
  );
  const { authenticated } = useSelector((state: RootState) => state.auth);

  const handleNavigate = () => {
    if (authenticated) {
      navigate("/home");
    } else {
      navigate("/login");
    }
  };

  const handleSelectProject = (project: ProjectDataProps) => {
    setSelectedProject(project);

    if (project.googleMaps) {
      const coords = extractCoordinates(project.googleMaps);
      if (coords) {
        setMapCenter(coords);
        const mapElement = document.getElementById("project-map-container");
        if (mapElement) {
          mapElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
  };

  const handleCloseProjectDetail = () => {
    setSelectedProject(null);
  };

  useEffect(() => {
    dispatch(fetchProjectsWithGoogleMaps());
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css";
    link.integrity =
      "sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==";
    link.crossOrigin = "";
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [dispatch]);

  useEffect(() => {
    if (projects && projects.length > 0) {
      const projectWithCoords = projects.find((p) => p.googleMaps);
      if (projectWithCoords && projectWithCoords.googleMaps) {
        const coords = extractCoordinates(projectWithCoords.googleMaps);
        if (coords) {
          setMapCenter(coords);
        }
      }
    }
  }, [projects]);

  if (projectFetchWithGoogleMapsRequest.inProgress) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="container mx-auto p-4">
        <h3 className="text-base/7 font-semibold text-gray-900">IACA</h3>
        <div className="flex justify-between items-center">
          <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
            Inteligencia Artificial para la Comunicación de Arquitectura
          </p>
          <Button
            title={authenticated ? "Go to dash" : "Go to Login"}
            onClick={handleNavigate}
          />
        </div>
      </div>

      <div
        id="project-map-container"
        className="mt-6 flex flex-col lg:flex-row h-[500px] w-full"
      >
        <div
          className={`${
            selectedProject ? "lg:w-1/2" : "w-full"
          } h-full rounded-lg shadow-md overflow-hidden transition-all duration-300`}
        >
          {projects && projects.length > 0 && (
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={8}
              className="h-full w-full"
              ref={mapRef}
            >
              <MapCenterUpdater center={mapCenter} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {projects.map((project) => (
                <ProjectMarker
                  key={project.id}
                  project={project}
                  onSelect={() => handleSelectProject(project)}
                  isSelected={selectedProject?.id === project.id}
                />
              ))}
            </MapContainer>
          )}
        </div>

        {selectedProject && (
          <div className="lg:w-1/2 h-full bg-white rounded-lg shadow-md overflow-auto">
            <div className="p-4 relative">
              <button
                onClick={handleCloseProjectDetail}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
                aria-label="Cerrar detalles"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
              <ProjectDetail project={selectedProject} />
            </div>
          </div>
        )}
      </div>

      {projects && projects.length > 0 && (
        <ProjectsGallery
          projects={projects}
          onSelectProject={handleSelectProject}
        />
      )}
    </div>
  );
};
