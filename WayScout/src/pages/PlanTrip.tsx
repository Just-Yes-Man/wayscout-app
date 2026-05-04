import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { MapLocationPickerDialog } from "../components/MapLocationPickerDialog";
import { geocodeLocation } from "../services/locationApi";
import {
  getCurrentWeatherByCoordinates,
  getNext24HoursWeatherByCoordinates,
  type CurrentWeather,
  type HourlyForecast,
  type Next24HoursWeather,
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

type LatLng = [number, number];
type SavedTrip = {
  id: string;
  createdAt: string;
  origin: string;
  destination: string;
  travelDate: string;
  transport: string[];
  notes: string;
  originCoordinates: LatLng | null;
  destinationCoordinates: LatLng | null;
  weather: CurrentWeather | null;
  weatherLocationLabel: string | null;
  weatherWarnings: string[];
  forecastSnapshot: Next24HoursWeather | null;
};

const formatHour = (iso: string) => {
  const match = /(\d{1,2}):(\d{2})/.exec(iso);
  if (!match) return iso;
  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "p.m." : "a.m.";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${period}`;
};

const PATCHY_RAIN_RE = /patchy|nearby|drizzle|llovizna/i;

const CONDITION_ES: Record<string, string> = {
  "sunny": "Soleado",
  "clear": "Despejado",
  "partly cloudy": "Parcialmente nublado",
  "cloudy": "Nublado",
  "overcast": "Cubierto",
  "mist": "Neblina",
  "fog": "Niebla",
  "freezing fog": "Niebla helada",
  "patchy rain possible": "Posible lluvia parchada",
  "patchy rain nearby": "Lluvia parchada cercana",
  "patchy light drizzle": "Llovizna ligera parchada",
  "light drizzle": "Llovizna ligera",
  "patchy light rain": "Lluvia ligera parchada",
  "light rain": "Lluvia ligera",
  "light rain shower": "Chubasco ligero",
  "moderate rain at times": "Lluvia moderada a ratos",
  "moderate rain": "Lluvia moderada",
  "moderate or heavy rain shower": "Chubasco moderado o intenso",
  "heavy rain at times": "Lluvia intensa a ratos",
  "heavy rain": "Lluvia intensa",
  "torrential rain shower": "Chubasco torrencial",
  "thundery outbreaks possible": "Posibles tormentas eléctricas",
  "patchy light rain with thunder": "Lluvia ligera parchada con truenos",
  "moderate or heavy rain with thunder": "Lluvia moderada o intensa con truenos",
};

const translateCondition = (condition: string): string => {
  const key = condition.trim().toLowerCase();
  return CONDITION_ES[key] ?? condition;
};

// Umbrales basados en estándares meteorológicos (mm/h):
// drizzle/patchy <0.5 · light 0.5–2.5 · moderate 2.5–7.6 · heavy ≥7.6
const classifyRain = (hours: HourlyForecast[]) => {
  const heavy = hours.filter(
    (h) => h.precipMm >= 7.6 || /heavy|torrential/i.test(h.condition),
  );
  const moderate = hours.filter(
    (h) =>
      !heavy.includes(h) &&
      (h.precipMm >= 2.5 || /moderate/i.test(h.condition)) &&
      !PATCHY_RAIN_RE.test(h.condition),
  );
  const light = hours.filter(
    (h) =>
      !heavy.includes(h) &&
      !moderate.includes(h) &&
      h.precipMm >= 0.5 &&
      h.precipMm < 2.5 &&
      !PATCHY_RAIN_RE.test(h.condition),
  );
  const drizzle = hours.filter(
    (h) =>
      !heavy.includes(h) &&
      !moderate.includes(h) &&
      !light.includes(h) &&
      (h.willItRain === 1 || h.chanceOfRain >= 60 || PATCHY_RAIN_RE.test(h.condition)) &&
      h.precipMm < 0.5,
  );
  return { heavy, moderate, light, drizzle };
};

const transportOptions = [
  { id: "carro", label: "Carro", icon: Car },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "moto", label: "Moto", icon: Bike },
  { id: "caminando", label: "Caminando", icon: Footprints },
] as const;

export function PlanTrip() {
  const navigate = useNavigate();
  const [view, setView] = useState<"list" | "create">("list");
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [lastCreatedTripId, setLastCreatedTripId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTransport, setSelectedTransport] = useState<string[]>(["carro"]);
  const [weatherPreview, setWeatherPreview] = useState<CurrentWeather | null>(null);
  const [weatherLocationLabel, setWeatherLocationLabel] = useState<string | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<"origin" | "destination" | null>(null);
  const [originCoordinates, setOriginCoordinates] = useState<LatLng | null>(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState<LatLng | null>(null);
  const [selectedWarning, setSelectedWarning] = useState<{ tripId: string; warning: string } | null>(
    null,
  );
  const [forecastByTrip, setForecastByTrip] = useState<Record<string, Next24HoursWeather>>({});
  const [forecastLoadingTripId, setForecastLoadingTripId] = useState<string | null>(null);
  const [forecastErrorByTrip, setForecastErrorByTrip] = useState<Record<string, string>>({});

  useEffect(() => {
    const currentTrips = localStorage.getItem("wayscout_trips");
    const parsedTrips = currentTrips ? (JSON.parse(currentTrips) as SavedTrip[]) : [];
    setTrips(parsedTrips);
  }, []);

  const buildWeatherWarnings = (
    weather: CurrentWeather | null,
    forecast: Next24HoursWeather | null,
  ): string[] => {
    if (!weather && !forecast) {
      return ["No se pudo consultar el clima del destino. Verifica condiciones antes de salir."];
    }

    const warnings: string[] = [];

    if (weather) {
      if (weather.windKph >= 35) {
        warnings.push(
          `Viento fuerte actual: ${Math.round(weather.windKph)} km/h. Conduce con precaución, especialmente en carretera abierta.`,
        );
      }
      if (weather.humidity >= 85) {
        warnings.push(
          `Humedad elevada actual: ${weather.humidity}%. Posibles bancos de niebla o visibilidad reducida.`,
        );
      }
    }

    const hours = forecast?.remainingHourlyForecast ?? [];

    if (hours.length > 0) {
      const { heavy, moderate, light, drizzle } = classifyRain(hours);

      const describeBlock = (block: HourlyForecast[]) => {
        const totalMm = block.reduce((acc, h) => acc + h.precipMm, 0);
        const firstTime = formatHour(block[0].time);
        const lastTime = formatHour(block[block.length - 1].time);
        const range =
          block.length === 1 ? `cerca de las ${firstTime}` : `entre ${firstTime} y ${lastTime}`;
        const maxProb = Math.max(...block.map((h) => h.chanceOfRain));
        return { totalMm, range, maxProb };
      };

      if (heavy.length > 0) {
        const { totalMm, range, maxProb } = describeBlock(heavy);
        warnings.push(
          `Lluvia intensa ${range}: ${heavy.length} h con ≥7.6 mm/h, prob. hasta ${maxProb}%, ~${totalMm.toFixed(1)} mm acumulados. Riesgo de calles inundadas y baja visibilidad.`,
        );
      } else if (moderate.length > 0) {
        const { totalMm, range, maxProb } = describeBlock(moderate);
        warnings.push(
          `Lluvia moderada ${range}: ${moderate.length} h con 2.5–7.6 mm/h, prob. hasta ${maxProb}%, ~${totalMm.toFixed(1)} mm acumulados. Lleva impermeable y suma tiempo extra.`,
        );
      } else if (light.length > 0) {
        const { totalMm, range, maxProb } = describeBlock(light);
        warnings.push(
          `Lluvia ligera ${range}: ${light.length} h con 0.5–2.5 mm/h, prob. hasta ${maxProb}%, ~${totalMm.toFixed(1)} mm acumulados. Conviene paraguas o impermeable.`,
        );
      } else if (drizzle.length > 0) {
        const sample = drizzle[0];
        const firstTime = formatHour(sample.time);
        const totalMm = drizzle.reduce((acc, h) => acc + h.precipMm, 0);
        warnings.push(
          `Posible llovizna o lluvia parchada (a partir de ${firstTime}, ${translateCondition(sample.condition).toLowerCase()}, <0.5 mm/h, ~${totalMm.toFixed(1)} mm en ${drizzle.length} h). Molestia menor, sin acumulación significativa.`,
        );
      }

      const stormHours = hours.filter((h) =>
        /storm|thunder|tormenta|trueno/i.test(h.condition),
      );
      if (stormHours.length > 0) {
        const firstStorm = formatHour(stormHours[0].time);
        warnings.push(
          `Tormenta pronosticada (${stormHours.length} h en las próximas 24, primera cerca de las ${firstStorm}). Evalúa retrasar el viaje si es posible.`,
        );
      }

      const temps = hours.map((h) => h.temperatureC);
      const maxTemp = Math.max(...temps);
      const minTemp = Math.min(...temps);
      if (maxTemp >= 32) {
        warnings.push(
          `Calor pronosticado: hasta ${Math.round(maxTemp)}°C en las próximas horas. Hidrátate y usa protección solar.`,
        );
      }
      if (minTemp <= 10) {
        warnings.push(
          `Frío pronosticado: mínima de ${Math.round(minTemp)}°C en las próximas horas. Lleva abrigo.`,
        );
      }
    } else if (weather) {
      const condition = weather.condition.toLowerCase();
      if (weather.temperatureC >= 32) {
        warnings.push(
          `Calor actual: ${Math.round(weather.temperatureC)}°C. Hidrátate y usa protección solar.`,
        );
      }
      if (weather.temperatureC <= 10) {
        warnings.push(
          `Frío actual: ${Math.round(weather.temperatureC)}°C. Lleva abrigo.`,
        );
      }
      if (
        condition.includes("rain") ||
        condition.includes("lluv") ||
        condition.includes("storm") ||
        condition.includes("thunder")
      ) {
        warnings.push("Lluvia o tormenta en el momento actual: considera impermeable y tiempo extra.");
      }
    }

    if (warnings.length > 0) return warnings;

    return hours.length > 0
      ? ["Pronóstico de las próximas 24 h sin alertas relevantes (sin lluvia, viento fuerte ni temperaturas extremas)."]
      : ["Sin alertas relevantes en el clima actual. No se pudo cargar el pronóstico horario para mayor precisión."];
  };

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

  const openMapPicker = (target: "origin" | "destination") => {
    setMapTarget(target);
    setIsMapPickerOpen(true);
  };

  const resetForm = () => {
    setOrigin("");
    setDestination("");
    setTravelDate("");
    setNotes("");
    setSelectedTransport(["carro"]);
    setWeatherPreview(null);
    setWeatherLocationLabel(null);
    setWeatherError(null);
    setOriginCoordinates(null);
    setDestinationCoordinates(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTransport.length === 0) return;

    let weatherToSave = weatherPreview;
    let weatherLabelToSave = weatherLocationLabel;
    let forecastToSave: Next24HoursWeather | null = null;
    let coordsForWeather: LatLng | null = destinationCoordinates;

    if (destination.trim()) {
      try {
        if (!coordsForWeather) {
          const geocodedLocation = await geocodeLocation(destination);
          if (geocodedLocation) {
            coordsForWeather = [geocodedLocation.latitude, geocodedLocation.longitude];
            weatherLabelToSave = geocodedLocation.label;
          }
        }

        if (coordsForWeather) {
          const [lat, lon] = coordsForWeather;
          const [currentResult, forecastResult] = await Promise.allSettled([
            weatherToSave
              ? Promise.resolve(weatherToSave)
              : getCurrentWeatherByCoordinates(lat, lon),
            getNext24HoursWeatherByCoordinates(lat, lon),
          ]);

          if (currentResult.status === "fulfilled") {
            weatherToSave = currentResult.value;
          }
          if (forecastResult.status === "fulfilled") {
            forecastToSave = forecastResult.value;
          }
        }
      } catch {
        // Mantén lo que tengamos disponible.
      }
    }

    const trip: SavedTrip = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      origin: origin.trim(),
      destination: destination.trim(),
      travelDate,
      transport: selectedTransport,
      notes: notes.trim(),
      originCoordinates,
      destinationCoordinates: destinationCoordinates ?? coordsForWeather,
      weather: weatherToSave,
      weatherLocationLabel: weatherLabelToSave,
      weatherWarnings: buildWeatherWarnings(weatherToSave, forecastToSave),
      forecastSnapshot: forecastToSave,
    };

    const updatedTrips = [trip, ...trips];
    localStorage.setItem("wayscout_trips", JSON.stringify(updatedTrips));
    setTrips(updatedTrips);
    setLastCreatedTripId(trip.id);
    resetForm();
    setView("list");
  };

  const handleWarningTap = async (trip: SavedTrip, warning: string) => {
    const isSameSelection =
      selectedWarning?.tripId === trip.id && selectedWarning.warning === warning;

    if (isSameSelection) {
      setSelectedWarning(null);
      return;
    }

    setSelectedWarning({ tripId: trip.id, warning });

    if (forecastByTrip[trip.id] || forecastLoadingTripId === trip.id) {
      return;
    }

    if (trip.forecastSnapshot) {
      setForecastByTrip((current) => ({ ...current, [trip.id]: trip.forecastSnapshot! }));
      return;
    }

    const destinationCoords = trip.destinationCoordinates;
    if (!destinationCoords) {
      setForecastErrorByTrip((current) => ({
        ...current,
        [trip.id]: "Este viaje no tiene coordenadas del destino para consultar pronóstico próximo.",
      }));
      return;
    }

    setForecastLoadingTripId(trip.id);
    setForecastErrorByTrip((current) => ({ ...current, [trip.id]: "" }));

    try {
      const forecast = await getNext24HoursWeatherByCoordinates(
        destinationCoords[0],
        destinationCoords[1],
      );
      setForecastByTrip((current) => ({ ...current, [trip.id]: forecast }));
    } catch {
      setForecastErrorByTrip((current) => ({
        ...current,
        [trip.id]: "No se pudo obtener el pronóstico próximo para explicar esta advertencia.",
      }));
    } finally {
      setForecastLoadingTripId(null);
    }
  };

  const handleClearAllTrips = () => {
    if (trips.length === 0) return;
    const confirmed = window.confirm(
      "¿Borrar todos los viajes guardados? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    localStorage.removeItem("wayscout_trips");
    setTrips([]);
    setLastCreatedTripId(null);
    setSelectedWarning(null);
    setForecastByTrip({});
    setForecastErrorByTrip({});
    setForecastLoadingTripId(null);
  };

  if (view === "list") {
    return (
      <div className="h-full overflow-y-auto bg-slate-50 pb-4">
        <div className="bg-white px-6 pt-6 pb-5 border-b border-slate-100 mb-4">
          <h1 className="text-2xl mb-1 text-slate-900">Mis viajes</h1>
          <p className="text-slate-500 text-sm">
            Revisa los viajes creados o agrega uno nuevo.
          </p>
        </div>

        <div className="px-6 space-y-4">
          <Button
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            onClick={() => setView("create")}
          >
            Crear viaje
          </Button>

          {trips.length > 0 && (
            <Button
              variant="outline"
              className="w-full h-11 border-red-200 text-red-700 hover:bg-red-50 rounded-xl"
              onClick={handleClearAllTrips}
            >
              Borrar todos los viajes
            </Button>
          )}

          {trips.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center text-slate-600">
              Aun no hay viajes guardados.
            </div>
          ) : (
            trips.map((trip) => (
              <div
                key={trip.id}
                className={`bg-white border rounded-xl p-4 shadow-sm space-y-2 ${
                  trip.id === lastCreatedTripId ? "border-blue-300" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-900">
                    <strong>{trip.origin}</strong> → <strong>{trip.destination}</strong>
                  </p>
                  {trip.id === lastCreatedTripId && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Nuevo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600">
                  Fecha: {trip.travelDate} · Transporte: {trip.transport.join(", ")}
                </p>
                {trip.notes && <p className="text-xs text-slate-600">Notas: {trip.notes}</p>}
                <div className="pt-1">
                  <p className="text-xs text-slate-900 mb-1">
                    Advertencias del clima
                    {trip.weatherLocationLabel ? ` (${trip.weatherLocationLabel})` : ""}:
                  </p>
                  <ul className="text-xs list-disc pl-4 space-y-1">
                    {trip.weatherWarnings.map((warning) => (
                      <li key={warning} className="text-amber-700">
                        <button
                          type="button"
                          onClick={() => handleWarningTap(trip, warning)}
                          className="text-left underline-offset-2 hover:underline"
                        >
                          {warning}
                        </button>
                      </li>
                    ))}
                  </ul>

                  {selectedWarning?.tripId === trip.id && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-700 mb-2">
                        Pronóstico horario que sustenta la advertencia:
                      </p>

                      {forecastLoadingTripId === trip.id && (
                        <p className="text-xs text-slate-600">Consultando clima próximo...</p>
                      )}

                      {forecastErrorByTrip[trip.id] && (
                        <p className="text-xs text-red-600">{forecastErrorByTrip[trip.id]}</p>
                      )}

                      {!forecastLoadingTripId && forecastByTrip[trip.id] && (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-700">
                            Próximas horas en{" "}
                            <strong>{trip.weatherLocationLabel ?? forecastByTrip[trip.id].city}</strong>
                          </p>
                          {forecastByTrip[trip.id].remainingHourlyForecast
                            .slice(0, 4)
                            .map((hour) => (
                              <p key={hour.time} className="text-xs text-slate-600">
                                {formatHour(hour.time)} · {Math.round(hour.temperatureC)}°C ·{" "}
                                Prob. {hour.chanceOfRain}% · {hour.precipMm.toFixed(1)} mm ·{" "}
                                {translateCondition(hour.condition)}
                              </p>
                            ))}
                          <p className="text-[10px] text-slate-500 mt-1">
                            Fuente: WeatherAPI.com. Precisión limitada en localidades pequeñas; verifica con SMN/Conagua antes de viajes críticos.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-4">
      <div className="bg-white px-6 pt-6 pb-5 border-b border-slate-100 mb-4">
        <h1 className="text-2xl mb-1 text-slate-900">Crear viaje</h1>
        <p className="text-slate-500 text-sm">
          Define tu punto de salida, destino y medio de transporte.
        </p>
      </div>

      <div className="px-6 mb-4">
        <Button variant="outline" className="w-full" onClick={() => setView("list")}>
          Ver lista de viajes
        </Button>
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
          <button
            type="button"
            onClick={() => openMapPicker("origin")}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <MapPin className="w-4 h-4" />
            Elegir en el mapa
          </button>
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
          <button
            type="button"
            onClick={() => openMapPicker("destination")}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <MapPin className="w-4 h-4" />
            Elegir en el mapa
          </button>

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
          Guardar viaje
        </Button>
      </form>

      <MapLocationPickerDialog
        isOpen={isMapPickerOpen}
        title={
          mapTarget === "origin"
            ? "Selecciona tu punto de salida"
            : "Selecciona tu destino"
        }
        subtitle={
          mapTarget === "origin" ? "Ubicación de salida" : "Ubicación del destino"
        }
        initialCoordinates={
          mapTarget === "origin" ? originCoordinates : destinationCoordinates
        }
        onClose={() => {
          setIsMapPickerOpen(false);
          setMapTarget(null);
        }}
        onApply={({ label, coordinates }) => {
          if (mapTarget === "origin") {
            setOrigin(label);
            setOriginCoordinates(coordinates);
            return;
          }

          setDestination(label);
          setDestinationCoordinates(coordinates);
        }}
      />
    </div>
  );
}
