import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { getDeviceLocality } from "../services/locationApi";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle,
  Car,
  CloudRain,
  MapPin,
  Camera,
  CheckCircle,
  LoaderCircle,
  X,
} from "lucide-react";

type EventType = "deslave" | "trafico" | "clima" | null;
type LatLng = [number, number];
const MAP_ZOOM = 15;

export function CreateReport() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<EventType>(null);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng>([14.6349, -90.5069]);
  const [isLocating, setIsLocating] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  const openMapPicker = () => {
    setMapError(null);
    setIsMapPickerOpen(true);
    setIsLocating(true);

    if (!navigator.geolocation) {
      setMapError("Tu dispositivo no soporta geolocalización.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const currentPosition: LatLng = [coords.latitude, coords.longitude];
        setMapCenter(currentPosition);
        setSelectedCoordinates(currentPosition);
        setIsLocating(false);
      },
      () => {
        setMapError("No fue posible obtener tu ubicación actual.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const applySelectedLocation = async () => {
    if (!selectedCoordinates) {
      setMapError("Selecciona un punto en el mapa para continuar.");
      return;
    }

    const [latitude, longitude] = selectedCoordinates;
    const locality = await getDeviceLocality(latitude, longitude);
    const fallbackCoordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    setLocation(locality ?? fallbackCoordinates);
    setMapError(null);
    setIsMapPickerOpen(false);
  };

  useEffect(() => {
    if (!isMapPickerOpen || !mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(mapCenter, MAP_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      setSelectedCoordinates([event.latlng.lat, event.latlng.lng]);
      setMapError(null);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [isMapPickerOpen, mapCenter]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapPickerOpen) return;

    map.setView(mapCenter, MAP_ZOOM);
  }, [mapCenter, isMapPickerOpen]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedCoordinates || !isMapPickerOpen) return;

    if (!markerRef.current) {
      markerRef.current = L.marker(selectedCoordinates).addTo(map);
    } else {
      markerRef.current.setLatLng(selectedCoordinates);
    }
  }, [selectedCoordinates, isMapPickerOpen]);

  if (submitted) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 border border-blue-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl text-slate-900 mb-2">¡Reporte Enviado!</h2>
          <p className="text-slate-600">
            Gracias por contribuir a la seguridad vial
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-4">
      {/* Header */}
      <div className="bg-white px-6 pt-6 pb-5 border-b border-slate-100 mb-4">
        <h1 className="text-2xl mb-1 text-slate-900">Crear Reporte</h1>
        <p className="text-slate-500 text-sm">
          Ayuda a otros conductores reportando incidentes
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Event Type Selection */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <Label className="text-slate-900 mb-3 block">
            Tipo de Incidente *
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectedType("deslave")}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedType === "deslave"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <AlertTriangle
                className={`w-8 h-8 mx-auto mb-2 ${
                  selectedType === "deslave" ? "text-red-500" : "text-slate-400"
                }`}
              />
              <span className="text-sm text-slate-900">Deslave</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("trafico")}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedType === "trafico"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Car
                className={`w-8 h-8 mx-auto mb-2 ${
                  selectedType === "trafico" ? "text-amber-500" : "text-slate-400"
                }`}
              />
              <span className="text-sm text-slate-900">Tráfico</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType("clima")}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedType === "clima"
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <CloudRain
                className={`w-8 h-8 mx-auto mb-2 ${
                  selectedType === "clima" ? "text-blue-500" : "text-slate-400"
                }`}
              />
              <span className="text-sm text-slate-900">Clima</span>
            </button>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <Label htmlFor="location" className="text-slate-900">
            Ubicación *
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
            <Input
              id="location"
              type="text"
              placeholder="Ej: Km 45, Autopista Norte"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-blue-500"
              required
            />
          </div>
          <button
            type="button"
            onClick={openMapPicker}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <MapPin className="w-4 h-4" />
            Elegir en el mapa
          </button>
        </div>

        {/* Description */}
        <div className="space-y-2 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <Label htmlFor="description" className="text-slate-900">
            Descripción *
          </Label>
          <Textarea
            id="description"
            placeholder="Describe el incidente con el mayor detalle posible..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-32 bg-white border-slate-200 focus:border-blue-500 resize-none"
            required
          />
          <p className="text-xs text-slate-500">
            Mínimo 20 caracteres ({description.length}/20)
          </p>
        </div>

        {/* Photo Upload */}
        <div className="space-y-2 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <Label className="text-slate-900">Fotografía (Opcional)</Label>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-white hover:bg-slate-50 transition-colors cursor-pointer">
            <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-1">
              Toca para agregar una foto
            </p>
            <p className="text-xs text-slate-500">
              Las fotos ayudan a verificar el reporte
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <h4 className="text-slate-900 mb-2">Información Adicional</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              Vía completamente bloqueada
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              Presencia de autoridades
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              Situación de emergencia
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!selectedType || !location || description.length < 20}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          Enviar Reporte
        </Button>

        <p className="text-xs text-center text-slate-500">
          Al enviar este reporte confirmas que la información es verídica
        </p>
      </form>

      {isMapPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[1px] flex items-end sm:items-center sm:justify-center">
          <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-sm text-slate-500">Ubicación del incidente</p>
                <h2 className="text-lg text-slate-900">Selecciona un punto en el mapa</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMapPickerOpen(false)}
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
              <div
                ref={mapContainerRef}
                className="w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-slate-200"
              />
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
                onClick={() => setIsMapPickerOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                onClick={applySelectedLocation}
              >
                Usar esta ubicación
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
