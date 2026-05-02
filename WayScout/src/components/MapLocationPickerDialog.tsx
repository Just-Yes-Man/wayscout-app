import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { LoaderCircle, MapPin, X } from "lucide-react";
import { Button } from "./ui/button";
import { getDeviceLocality } from "../services/locationApi";
import "leaflet/dist/leaflet.css";

type LatLng = [number, number];

const DEFAULT_MAP_CENTER: LatLng = [14.6349, -90.5069];
const MAP_ZOOM = 15;

type MapLocationPickerDialogProps = {
  isOpen: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  onApply: (payload: { label: string; coordinates: LatLng }) => void;
  initialCoordinates?: LatLng | null;
};

type MapCenterSyncProps = {
  center: LatLng;
};

type MapMoveHandlerProps = {
  onMoveEnd: (coordinates: LatLng) => void;
};

function MapCenterSync({ center }: MapCenterSyncProps) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function MapMoveHandler({ onMoveEnd }: MapMoveHandlerProps) {
  useMapEvents({
    moveend: (event) => {
      const center = event.target.getCenter();
      onMoveEnd([center.lat, center.lng]);
    },
  });

  return null;
}

type DialogBodyProps = Omit<MapLocationPickerDialogProps, "isOpen">;

function DialogBody({
  title,
  subtitle,
  onClose,
  onApply,
  initialCoordinates,
}: DialogBodyProps) {
  const [selectedCoordinates, setSelectedCoordinates] = useState<LatLng | null>(
    initialCoordinates ?? null,
  );
  const [mapCenter, setMapCenter] = useState<LatLng>(
    initialCoordinates ?? DEFAULT_MAP_CENTER,
  );
  const [isLocating, setIsLocating] = useState(!initialCoordinates);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCoordinates) {
      return;
    }

    if (!navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMapError("Tu dispositivo no soporta geolocalización.");
      setIsLocating(false);
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (cancelled) return;
        const currentPosition: LatLng = [coords.latitude, coords.longitude];
        setMapCenter(currentPosition);
        setSelectedCoordinates((current) => current ?? currentPosition);
        setIsLocating(false);
      },
      () => {
        if (cancelled) return;
        setMapError("No fue posible obtener tu ubicación actual.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );

    return () => {
      cancelled = true;
    };
  }, [initialCoordinates]);

  const handleMapMoveEnd = (coordinates: LatLng) => {
    setSelectedCoordinates(coordinates);
    setMapError(null);
  };

  const handleApply = async () => {
    if (!selectedCoordinates) {
      setMapError("Selecciona un punto en el mapa para continuar.");
      return;
    }

    const [latitude, longitude] = selectedCoordinates;
    const locality = await getDeviceLocality(latitude, longitude);
    const fallbackCoordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    onApply({
      label: locality ?? fallbackCoordinates,
      coordinates: selectedCoordinates,
    });
    setMapError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[1px] flex items-end sm:items-center sm:justify-center">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm text-slate-500">{subtitle}</p>
            <h2 className="text-lg text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Cerrar selector de mapa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4">
          {isLocating && (
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
              <LoaderCircle className="w-4 h-4 animate-spin" />
              <span>Detectando tu ubicación actual...</span>
            </div>
          )}
          {mapError && <p className="mb-3 text-sm text-red-600">{mapError}</p>}
        </div>

        <div className="px-5">
          <div className="relative rounded-xl overflow-hidden border border-slate-200">
            <MapContainer
              center={mapCenter}
              zoom={MAP_ZOOM}
              className="w-full h-72 sm:h-80"
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapCenterSync center={mapCenter} />
              <MapMoveHandler onMoveEnd={handleMapMoveEnd} />
            </MapContainer>
            <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
              <span className="rounded-lg bg-black/60 text-white text-xs px-2 py-1">
                Arrastra el mapa para ubicar el pin
              </span>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="-translate-y-4 text-red-600 drop-shadow-md">
                <MapPin className="w-8 h-8" />
              </div>
            </div>
          </div>
          {selectedCoordinates && (
            <p className="mt-2 text-xs text-slate-500">
              Coordenadas seleccionadas: {selectedCoordinates[0].toFixed(5)},{" "}
              {selectedCoordinates[1].toFixed(5)}
            </p>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleApply}
          >
            Usar esta ubicación
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MapLocationPickerDialog({
  isOpen,
  ...props
}: MapLocationPickerDialogProps) {
  if (!isOpen) {
    return null;
  }

  // El `key` fuerza remontaje en cada apertura, lo que reinicia el estado
  // interno de DialogBody sin necesidad de resetearlo dentro de un useEffect.
  return <DialogBody key="open" {...props} />;
}