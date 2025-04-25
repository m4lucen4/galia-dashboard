import { useEffect, useState } from "react";
import { fetchProjectsWithGoogleMaps } from "../redux/actions/ProjectActions";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { RootState } from "../redux/store";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import { LoadingSpinner } from "../components/shared/ui/LoadingSpinner";
import { Coordinates } from "../types";
import { extractCoordinates } from "../helpers";
import { Button } from "../components/shared/ui/Button";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ProjectMarker } from "../components/iaca/ProjectMarker";

interface IconDefaultPrototype extends L.Icon.Default {
  _getIconUrl?: () => string;
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
  const [mapCenter, setMapCenter] = useState<Coordinates>({
    lat: 37.5443,
    lng: -4.7278,
  });

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

      <div className="mt-6 h-[600px] w-full rounded-lg shadow-md overflow-hidden">
        {projects && projects.length > 0 && (
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={8}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {projects.map((project) => (
              <ProjectMarker key={project.id} project={project} />
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
};
