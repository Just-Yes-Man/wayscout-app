import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { geocodeLocation } from "../services/locationApi";
import {
  getCurrentWeatherByCoordinates,
  type CurrentWeather,
} from "../services/weatherApi";
import {
  CheckCircle,
  MapPin,
  Route,
  Bus,
  Car,
  Bike,
  Footprints,
  LoaderCircle,
  CloudSun,
  AlertCircle,
} from "lucide-react";

const transportOptions = [
  { id: "carro", label: "Carro", icon: Car },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "moto", label: "Moto", icon: Bike },
  { id: "caminando", label: "Caminando", icon: Footprints },
] as const;

export function PlanTrip() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTransport, setSelectedTransport] = useState<string[]>(["carro"]);
  const [weatherPreview, setWeatherPreview] = useState<CurrentWeather | null>(null);
  const [weatherLocationLabel, setWeatherLocationLabel] = useState<string | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const toggleTransport = (transport: string) => {
    setSelectedTransport((current) =>
      current.includes(transport)
        ? current.filter((item) => item !== transport)
        : [...current, transport],
    );
  };

  const checkDestinationWeather = async () => {
    if (!destination.trim()) {
      setWeatherPreview(null);
      setWeatherLocationLabel(null);
      setWeatherError("Ingresa un destino para consultar el clima.");
      return;
    }

    setIsWeatherLoading(true);
    setWeatherError(null);

    try {
      const geocodedLocation = await geocodeLocation(destination);

      if (!geocodedLocation) {
        setWeatherPreview(null);
        setWeatherLocationLabel(null);
        setWeatherError("No encontramos la ubicación. Prueba con un destino más específico.");
        return;
      }

      const weather = await getCurrentWeatherByCoordinates(
        geocodedLocation.latitude,
        geocodedLocation.longitude,
      );

      setWeatherPreview(weather);
      setWeatherLocationLabel(geocodedLocation.label);
      setWeatherError(null);
    } catch {
      setWeatherPreview(null);
      setWeatherLocationLabel(null);
      setWeatherError("No fue posible obtener el clima en este momento.");
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTransport.length === 0) return;

    setSubmitted(true);
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 border border-blue-100 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl text-slate-900 mb-2">¡Viaje planeado!</h2>
          <p className="text-slate-600">Tu ruta fue procesada correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-4">
      <div className="bg-white px-6 pt-6 pb-5 border-b border-slate-100 mb-4">
        <h1 className="text-2xl mb-1 text-slate-900">Planear viaje</h1>
        <p className="text-slate-500 text-sm">
          Define tu punto de salida, destino y medio de transporte.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-2 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <Label htmlFor="origin" className="text-slate-900">
            Lugar de salida *
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
            <Input
              id="origin"
              type="text"
              placeholder="Ej: Zona 10, Ciudad de Guatemala"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div className="space-y-3 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <Label htmlFor="destination" className="text-slate-900">
            Objetivo / destino *
          </Label>
          <div className="relative">
            <Route className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
            <Input
              id="destination"
              type="text"
              placeholder="Ej: Antigua Guatemala"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-blue-500"
              required
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={checkDestinationWeather}
            disabled={isWeatherLoading}
          >
            {isWeatherLoading ? (
              <>
                <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                Consultando clima...
              </>
            ) : (
              <>
                <CloudSun className="w-4 h-4 mr-2" />
                Ver posible clima del destino
              </>
            )}
          </Button>

          {(weatherError || weatherPreview) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {weatherError && (
                <div className="flex items-start gap-2 text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>{weatherError}</span>
                </div>
              )}

              {weatherPreview && (
                <div className="space-y-1.5 text-sm text-slate-700">
                  <p className="text-slate-900">
                    Clima estimado en <strong>{weatherLocationLabel ?? weatherPreview.city}</strong>
                  </p>
                  <p>
                    {weatherPreview.condition} · {Math.round(weatherPreview.temperatureC)}°C
                  </p>
                  <p className="text-xs text-slate-500">
                    Sensación {Math.round(weatherPreview.feelsLikeC)}° · Humedad {weatherPreview.humidity}%
                    · Viento {Math.round(weatherPreview.windKph)} km/h
                  </p>
                  <p className="text-xs text-blue-700">
                    Este aviso es informativo para planificar tu viaje, sin guardar todavía en base de datos.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <Label htmlFor="travelDate" className="text-slate-900">
            Fecha de viaje *
          </Label>
          <Input
            id="travelDate"
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            className="bg-white border-slate-200 focus:border-blue-500"
            required
          />
        </div>

        <div className="space-y-3 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <Label className="text-slate-900">Medios de transporte *</Label>
          <div className="grid grid-cols-2 gap-3">
            {transportOptions.map(({ id, label, icon: Icon }) => {
              const isSelected = selectedTransport.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleTransport(id)}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </button>
              );
            })}
          </div>
          {selectedTransport.length === 0 && (
            <p className="text-xs text-red-600">Selecciona al menos un medio de transporte.</p>
          )}
        </div>

        <div className="space-y-2 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
          <Label htmlFor="notes" className="text-slate-900">
            Notas adicionales (Opcional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Ej: Evitar peajes, salir temprano, viajar con niños..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 bg-white border-slate-200 focus:border-blue-500 resize-none"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          disabled={selectedTransport.length === 0}
        >
          Guardar plan de viaje
        </Button>
      </form>
    </div>
  );
}
