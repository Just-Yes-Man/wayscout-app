import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { MapLocationPickerDialog } from "../components/MapLocationPickerDialog";
import {
  AlertTriangle,
  Car,
  CloudRain,
  MapPin,
  Camera,
  CheckCircle,
} from "lucide-react";

type EventType = "deslave" | "trafico" | "clima" | null;
type LatLng = [number, number];

export function CreateReport() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<EventType>(null);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<LatLng | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  const openMapPicker = () => {
    setIsMapPickerOpen(true);
  };

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

      <MapLocationPickerDialog
        isOpen={isMapPickerOpen}
        title="Selecciona un punto en el mapa"
        subtitle="Ubicación del incidente"
        initialCoordinates={selectedCoordinates}
        onClose={() => setIsMapPickerOpen(false)}
        onApply={({ label, coordinates }) => {
          setLocation(label);
          setSelectedCoordinates(coordinates);
        }}
      />
    </div>
  );
}
