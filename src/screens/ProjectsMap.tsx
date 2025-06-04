import { useEffect, useState, useRef } from "react";

import { useNavigate, useParams, useLocation } from "react-router-dom";
import { fetchProjectsWithGoogleMaps } from "../redux/actions/ProjectActions";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { LoadingSpinner } from "../components/shared/ui/LoadingSpinner";
import { Coordinates, ProjectDataProps } from "../types";
import { extractCoordinates } from "../helpers";
import { ProjectMarker } from "../components/iaca/ProjectMarker";
import { ProjectDetail } from "../components/iaca/ProjectDetail";
import { ProjectsGallery } from "../components/iaca/ProjectsGallery";
import { XMarkIcon } from "@heroicons/react/24/outline";
import NavbarMap from "../components/shared/ui/NavbarMap";
import { useTranslation } from "react-i18next";
import provinces from "../assets/regions/provinces.json";
import { clearProjects } from "../redux/slices/ProjectSlice";

const sortedProvinces = [...provinces].sort((a, b) =>
  a.label.localeCompare(b.label)
);

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

export const ProjectsMap = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>({
    lat: 37.5443,
    lng: -4.7278,
  });
  const [selectedProject, setSelectedProject] =
    useState<ProjectDataProps | null>(null);
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  const { projectFetchWithGoogleMapsRequest, projects } = useAppSelector(
    (state: RootState) => state.project
  );

  const handleSelectProject = (project: ProjectDataProps) => {
    setSelectedProject(project);
    navigate(`/projects-map/${project.id}${location.search}`);

    if (project.googleMaps) {
      const coords = extractCoordinates(project.googleMaps);
      if (coords) {
        setMapCenter(coords);
      }
    }
  };

  const handleCloseProjectDetail = () => {
    setSelectedProject(null);
    navigate(`/projects-map${location.search}`);
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      const [lat, lng] = e.target.value
        .split(",")
        .map((coord) => parseFloat(coord));
      setMapCenter({ lat, lng });
    }
  };

  useEffect(() => {
    dispatch(fetchProjectsWithGoogleMaps()).then(() => {
      setProjectsLoaded(true);
    });

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css";
    link.integrity =
      "sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A==";
    link.crossOrigin = "";
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
      dispatch(clearProjects());
    };
  }, [dispatch]);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const project = projects.find(
        (p) => String(p.id) === projectId || String(p.id) === String(projectId)
      );

      if (project) {
        setSelectedProject(project);
        if (project.googleMaps) {
          const coords = extractCoordinates(project.googleMaps);
          if (coords) {
            setMapCenter(coords);
          }
        }
      } else {
        if (projectsLoaded) {
          dispatch(fetchProjectsWithGoogleMaps());
        }
      }
    }
  }, [projectId, projects, projectsLoaded, dispatch]);

  if (projectFetchWithGoogleMapsRequest.inProgress) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <NavbarMap />
      <div className="container mx-auto p-4">
        <h3 className="text-base/7 font-semibold text-gray-900">
          {t("maps.title")}
        </h3>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <p className="mt-1 max-w-xl text-sm/6 text-gray-500">
            {t("maps.subtitle")}
          </p>
          <div className="w-full md:w-64">
            <select
              id="province-select"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              onChange={handleProvinceChange}
              defaultValue=""
            >
              <option value="" disabled>
                Selecciona una provincia
              </option>
              {sortedProvinces.map((province) => (
                <option
                  key={province.code}
                  value={province.coordinates.join(",")}
                >
                  {province.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div
        id="project-map-container"
        className="mt-4 flex flex-col lg:flex-row h-[500px] w-full"
      >
        <div
          className={`${
            selectedProject ? "lg:w-2/3" : "w-full"
          } h-full rounded-lg shadow-md overflow-hidden transition-all duration-300`}
        >
          {projects && projects.length > 0 && (
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={8}
              className="h-full w-full"
              ref={mapRef}
              scrollWheelZoom={false}
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
          <div className="lg:w-1/3 h-full bg-white rounded-lg shadow-md overflow-auto">
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
