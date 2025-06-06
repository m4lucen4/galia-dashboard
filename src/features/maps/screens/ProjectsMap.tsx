import { useEffect, useState, useRef } from "react";

import { useNavigate, useParams, useLocation } from "react-router-dom";
import { fetchProjectsWithGoogleMaps } from "../../../redux/actions/ProjectActions";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { RootState } from "../../../redux/store";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { LoadingSpinner } from "../../../components/shared/ui/LoadingSpinner";
import { Coordinates, ProjectDataProps } from "../../../types";
import { extractCoordinates } from "../../../helpers";
import { ProjectMarker } from "../components/ProjectMarker";
import { ProjectDetail } from "../components/ProjectDetail";
import { ProjectsGallery } from "../components/ProjectsGallery";
import Navbar from "../../../components/shared/ui/Navbar";
import { clearProjects } from "../../../redux/slices/ProjectSlice";
import { HeaderMap } from "../components/HeaderMap";
import { Drawer } from "../../../components/shared/ui/Drawer";

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { projectFetchWithGoogleMapsRequest, projects } = useAppSelector(
    (state: RootState) => state.project
  );

  const handleSelectProject = (project: ProjectDataProps) => {
    setSelectedProject(project);
    setIsDrawerOpen(true);
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
    setIsDrawerOpen(false);
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
      <Navbar />
      <HeaderMap onProvinceChange={handleProvinceChange} />

      <div
        id="project-map-container"
        className="mt-4 flex flex-col lg:flex-row h-[500px] w-full"
      >
        <div className="w-full h-full rounded-lg shadow-md overflow-hidden transition-all duration-300">
          {projects && projects.length > 0 && (
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={8}
              className="h-full w-full z-0"
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
      </div>

      {projects && projects.length > 0 && (
        <ProjectsGallery
          projects={projects}
          onSelectProject={handleSelectProject}
        />
      )}

      {selectedProject && (
        <Drawer
          title={selectedProject.title}
          isOpen={isDrawerOpen}
          onClose={handleCloseProjectDetail}
        >
          <ProjectDetail project={selectedProject} />
        </Drawer>
      )}
    </div>
  );
};
