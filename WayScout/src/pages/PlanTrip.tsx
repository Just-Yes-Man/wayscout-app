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
import { getRouteTraffic, type TrafficRoute } from "../services/trafficApi";
import { getLocalNews, type LocalNewsItem } from "../services/localNewsApi";
import {
  CheckCircle,
  MapPin,
  Bus,
  Car,
  Bike,
  Footprints,
  LoaderCircle,
  CloudSun,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  Compass,
  Flag,
  Info,
  Plus,
  StickyNote,
  Thermometer,
  Trash2,
  Wind,
  Droplets,
  Plane,
  Newspaper,
  ExternalLink,
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
  trafficWarnings?: string[];
  trafficByTransport?: Record<string, TrafficRoute>;
  localNews?: LocalNewsItem[];
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

type WarningSeverity = "high" | "medium" | "info";

const classifyWarningSeverity = (warning: string): WarningSeverity => {
  const w = warning.toLowerCase();
  if (
    /intens|torrencial|tormenta|trueno|alto impacto|inundad|deslave|calor|frío|frio|viento fuerte/.test(
      w,
    )
  ) {
    return "high";
  }
  if (/moderad|ligera|llovizna|humedad|niebla|visibilidad|impermeable|abrigo|paraguas/.test(w)) {
    return "medium";
  }
  return "info";
};

const severityStyles: Record<
  WarningSeverity,
  { container: string; icon: string; iconBg: string; label: string; labelText: string }
> = {
  high: {
    container: "border-red-200 bg-red-50/60 hover:bg-red-50",
    icon: "text-red-600",
    iconBg: "bg-red-100",
    label: "Alta",
    labelText: "text-red-700",
  },
  medium: {
    container: "border-amber-200 bg-amber-50/60 hover:bg-amber-50",
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    label: "Media",
    labelText: "text-amber-700",
  },
  info: {
    container: "border-slate-200 bg-slate-50/80 hover:bg-slate-100",
    icon: "text-slate-500",
    iconBg: "bg-slate-100",
    label: "Info",
    labelText: "text-slate-600",
  },
};

const SeverityIcon = ({ severity, className }: { severity: WarningSeverity; className?: string }) => {
  if (severity === "high") return <AlertTriangle className={className} />;
  if (severity === "medium") return <AlertCircle className={className} />;
  return <Info className={className} />;
};

const formatTripDate = (iso: string): string => {
  if (!iso) return "Sin fecha";
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const transportFromId = (id: string) => transportOptions.find((opt) => opt.id === id);

const transportToTomTomMode: Record<string, string> = {
  carro: "car",
  bus: "bus",
  moto: "motorcycle",
  caminando: "pedestrian",
};

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
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [savingStep, setSavingStep] = useState<string>("");
  const [isClearingTrips, setIsClearingTrips] = useState(false);
  const [tripsLoading, setTripsLoading] = useState(true);

  useEffect(() => {
    const currentTrips = localStorage.getItem("wayscout_trips");
    const parsedTrips = currentTrips ? (JSON.parse(currentTrips) as SavedTrip[]) : [];
    setTrips(parsedTrips);
    setTripsLoading(false);
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

  const buildTrafficWarnings = (
    trafficByTransport: Record<string, TrafficRoute>,
    selectedModes: string[],
    fallbackMessage?: string,
  ): string[] => {
    const warnings: string[] = [];

    for (const mode of selectedModes) {
      const traffic = trafficByTransport[mode];
      if (!traffic) continue;

      const modeLabel = transportOptions.find((item) => item.id === mode)?.label ?? mode;
      const distanceKm = (traffic.routeLengthMeters / 1000).toFixed(1);
      const totalMinutes = Math.round(traffic.travelTimeWithTrafficSeconds / 60);

      warnings.push(
        `${modeLabel}: ${traffic.advisory} Distancia estimada ${distanceKm} km.`,
      );

      if (traffic.trafficLevel === "high") {
        warnings.push(
          `${modeLabel}: alto impacto de trafico detectado para esta ruta (${totalMinutes} min aprox.).`,
        );
      }
    }

    if (warnings.length > 0) return warnings;

    return [fallbackMessage ?? "No se pudo estimar el trafico de la ruta con los datos actuales."];
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
    if (selectedTransport.length === 0 || isSavingTrip) return;

    setIsSavingTrip(true);
    setSavingStep("Preparando tu viaje...");

    let weatherToSave = weatherPreview;
    let weatherLabelToSave = weatherLocationLabel;
    let forecastToSave: Next24HoursWeather | null = null;
    let coordsForWeather: LatLng | null = destinationCoordinates;
    let originCoordsForTraffic: LatLng | null = originCoordinates;
    let destinationCoordsForTraffic: LatLng | null = destinationCoordinates;
    let trafficByTransport: Record<string, TrafficRoute> = {};
    let trafficFallbackMessage: string | undefined;
    let localNewsToSave: LocalNewsItem[] = [];

    if (destination.trim()) {
      try {
        if (!coordsForWeather) {
          setSavingStep("Localizando destino...");
          const geocodedLocation = await geocodeLocation(destination);
          if (geocodedLocation) {
            coordsForWeather = [geocodedLocation.latitude, geocodedLocation.longitude];
            weatherLabelToSave = geocodedLocation.label;
          }
        }

        if (coordsForWeather) {
          setSavingStep("Consultando clima del destino...");
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

    const localNewsLocation =
      weatherLabelToSave ||
      (weatherToSave
        ? [weatherToSave.city, weatherToSave.region, weatherToSave.country]
            .filter(Boolean)
            .join(", ")
        : destination.trim());

    if (localNewsLocation) {
      try {
        setSavingStep("Analizando noticias locales...");
        localNewsToSave = await getLocalNews(localNewsLocation, 3);
      } catch {
        // Si falla la consulta de noticias, mantenemos el guardado del viaje.
        localNewsToSave = [];
      }
    }

    try {
      if (!originCoordsForTraffic && origin.trim()) {
        setSavingStep("Localizando punto de salida...");
        const geocodedOrigin = await geocodeLocation(origin);
        if (geocodedOrigin) {
          originCoordsForTraffic = [geocodedOrigin.latitude, geocodedOrigin.longitude];
        }
      }

      if (!destinationCoordsForTraffic && destination.trim()) {
        const geocodedDestination = await geocodeLocation(destination);
        if (geocodedDestination) {
          destinationCoordsForTraffic = [geocodedDestination.latitude, geocodedDestination.longitude];
        }
      }

      if (originCoordsForTraffic && destinationCoordsForTraffic) {
        setSavingStep("Analizando tráfico de la ruta...");
        const trafficResults = await Promise.allSettled(
          selectedTransport.map((mode) =>
            getRouteTraffic({
              originLat: originCoordsForTraffic![0],
              originLon: originCoordsForTraffic![1],
              destinationLat: destinationCoordsForTraffic![0],
              destinationLon: destinationCoordsForTraffic![1],
              travelMode: transportToTomTomMode[mode] ?? "car",
            }).then((traffic) => ({ mode, traffic })),
          ),
        );

        trafficByTransport = trafficResults.reduce<Record<string, TrafficRoute>>((acc, result) => {
          if (result.status === "fulfilled") {
            acc[result.value.mode] = result.value.traffic;
          }
          return acc;
        }, {});

        const firstRejected = trafficResults.find((result) => result.status === "rejected");
        if (Object.keys(trafficByTransport).length === 0 && firstRejected?.status === "rejected") {
          trafficFallbackMessage =
            firstRejected.reason instanceof Error
              ? firstRejected.reason.message
              : "No se pudo estimar el trafico de la ruta con los datos actuales.";
        }
      }
    } catch {
      // Si falla trafico, mantenemos el guardado del viaje.
      trafficFallbackMessage = "No se pudo estimar el trafico de la ruta con los datos actuales.";
    }

    setSavingStep("Guardando viaje...");

    const trip: SavedTrip = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      origin: origin.trim(),
      destination: destination.trim(),
      travelDate,
      transport: selectedTransport,
      notes: notes.trim(),
      originCoordinates,
      destinationCoordinates: destinationCoordinates ?? coordsForWeather ?? destinationCoordsForTraffic,
      weather: weatherToSave,
      weatherLocationLabel: weatherLabelToSave,
      weatherWarnings: buildWeatherWarnings(weatherToSave, forecastToSave),
      trafficWarnings: buildTrafficWarnings(trafficByTransport, selectedTransport, trafficFallbackMessage),
      trafficByTransport,
      localNews: localNewsToSave,
      forecastSnapshot: forecastToSave,
    };

    const updatedTrips = [trip, ...trips];
    localStorage.setItem("wayscout_trips", JSON.stringify(updatedTrips));
    setTrips(updatedTrips);
    setLastCreatedTripId(trip.id);
    resetForm();
    setIsSavingTrip(false);
    setSavingStep("");
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
    if (trips.length === 0 || isClearingTrips) return;
    const confirmed = window.confirm(
      "¿Borrar todos los viajes guardados? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    setIsClearingTrips(true);
    setTimeout(() => {
      localStorage.removeItem("wayscout_trips");
      setTrips([]);
      setLastCreatedTripId(null);
      setSelectedWarning(null);
      setForecastByTrip({});
      setForecastErrorByTrip({});
      setForecastLoadingTripId(null);
      setIsClearingTrips(false);
    }, 350);
  };

  if (view === "list") {
    const totalAlerts = trips.reduce(
      (acc, trip) =>
        acc + (trip.weatherWarnings?.length ?? 0) + (trip.trafficWarnings?.length ?? 0),
      0,
    );
    const highPriorityCount = trips.reduce((acc, trip) => {
      const warnings = [
        ...(trip.weatherWarnings ?? []),
        ...(trip.trafficWarnings ?? []),
      ];
      return acc + warnings.filter((w) => classifyWarningSeverity(w) === "high").length;
    }, 0);

    return (
      <div className="h-full overflow-y-auto bg-slate-50 pb-28">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pt-6 pb-8 text-white">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-sm text-blue-100 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Inicio
          </button>

          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h1 className="text-2xl mb-1">Mis viajes</h1>
              <p className="text-blue-100 text-sm">
                Planifica con anticipación y mantente al tanto del clima y tráfico.
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-2.5 flex-shrink-0">
              <Plane className="w-6 h-6" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white/12 backdrop-blur-sm rounded-xl p-3 border border-white/15">
              <p className="text-[11px] uppercase tracking-wide text-blue-100">Viajes</p>
              <p className="text-2xl mt-0.5">{trips.length}</p>
            </div>
            <div className="bg-white/12 backdrop-blur-sm rounded-xl p-3 border border-white/15">
              <p className="text-[11px] uppercase tracking-wide text-blue-100">Alertas</p>
              <p className="text-2xl mt-0.5">{totalAlerts}</p>
            </div>
            <div className="bg-white/12 backdrop-blur-sm rounded-xl p-3 border border-white/15">
              <p className="text-[11px] uppercase tracking-wide text-blue-100">Prioritarias</p>
              <p className="text-2xl mt-0.5">{highPriorityCount}</p>
            </div>
          </div>
        </div>

        <div className="px-5 -mt-5 space-y-4">
          <button
            type="button"
            onClick={() => setView("create")}
            className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-md hover:shadow-lg hover:border-blue-200 transition-all flex items-center gap-3 text-left"
          >
            <div className="bg-blue-600 text-white rounded-xl p-2.5 flex-shrink-0">
              <Plus className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900">Planificar nuevo viaje</p>
              <p className="text-xs text-slate-500">Origen, destino, fecha y transporte</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
          </button>

          {tripsLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-5 w-28 bg-slate-200 rounded-full" />
                    <div className="h-4 w-16 bg-slate-200 rounded-full" />
                  </div>
                  <div className="space-y-2 pl-6">
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                    <div className="h-3 w-16 bg-slate-100 rounded mt-3" />
                    <div className="h-4 w-2/3 bg-slate-200 rounded" />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <div className="h-6 w-16 bg-slate-100 rounded-full" />
                    <div className="h-6 w-20 bg-slate-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Compass className="w-7 h-7" />
              </div>
              <p className="text-slate-900 mb-1">Aún no hay viajes guardados</p>
              <p className="text-sm text-slate-500">
                Crea tu primer viaje y revisa el clima y tráfico antes de salir.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pt-1">
                <h2 className="text-sm uppercase tracking-wide text-slate-500">
                  Viajes guardados
                </h2>
                <button
                  type="button"
                  onClick={handleClearAllTrips}
                  disabled={isClearingTrips}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isClearingTrips ? (
                    <>
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      Borrando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Borrar todos
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {trips.map((trip) => {
                  const allWarnings = [
                    ...(trip.weatherWarnings ?? []),
                    ...(trip.trafficWarnings ?? []),
                  ];
                  const severityCounts = allWarnings.reduce(
                    (acc, w) => {
                      acc[classifyWarningSeverity(w)] += 1;
                      return acc;
                    },
                    { high: 0, medium: 0, info: 0 } as Record<WarningSeverity, number>,
                  );
                  const isNew = trip.id === lastCreatedTripId;

                  return (
                    <div
                      key={trip.id}
                      className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${
                        isNew ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"
                      }`}
                    >
                      <div className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 rounded-full px-2.5 py-1 text-xs">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatTripDate(trip.travelDate)}
                          </div>
                          {isNew && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Nuevo
                            </span>
                          )}
                        </div>

                        <div className="relative pl-6">
                          <span className="absolute left-1.5 top-2 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100" />
                          <span className="absolute left-2.5 top-6 bottom-6 w-px border-l-2 border-dashed border-slate-300" />
                          <span className="absolute left-1 bottom-1.5 text-blue-600">
                            <Flag className="w-4 h-4" />
                          </span>

                          <div className="mb-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">
                              Origen
                            </p>
                            <p className="text-sm text-slate-900">{trip.origin || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">
                              Destino
                            </p>
                            <p className="text-sm text-slate-900">{trip.destination || "—"}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {trip.transport.map((mode) => {
                            const opt = transportFromId(mode);
                            const Icon = opt?.icon ?? Car;
                            return (
                              <span
                                key={mode}
                                className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-1 text-xs"
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {opt?.label ?? mode}
                              </span>
                            );
                          })}
                        </div>

                        {trip.notes && (
                          <div className="mt-3 flex items-start gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                            <StickyNote className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-600">{trip.notes}</p>
                          </div>
                        )}

                        {trip.weather && (
                          <div className="mt-3 flex items-center gap-3 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 rounded-xl px-3 py-2.5">
                            <div className="bg-white text-sky-600 rounded-lg p-2 shadow-sm">
                              <CloudSun className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-500">
                                Clima en {trip.weatherLocationLabel ?? trip.weather.city}
                              </p>
                              <p className="text-sm text-slate-900 truncate">
                                {translateCondition(trip.weather.condition)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Thermometer className="w-3.5 h-3.5" />
                                {Math.round(trip.weather.temperatureC)}°
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Droplets className="w-3.5 h-3.5" />
                                {trip.weather.humidity}%
                              </span>
                            </div>
                          </div>
                        )}

                        {(trip.localNews?.length ?? 0) > 0 && (
                          <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="bg-white text-violet-600 rounded-lg p-1.5 shadow-sm">
                                <Newspaper className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs text-violet-700">Noticias locales</p>
                                <p className="text-[11px] text-slate-500">
                                  Cerca de {trip.weatherLocationLabel ?? trip.destination}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              {trip.localNews!.slice(0, 3).map((news) => (
                                <button
                                  key={news.id}
                                  type="button"
                                  onClick={() =>
                                    window.open(news.url, "_blank", "noopener,noreferrer")
                                  }
                                  className="w-full text-left rounded-lg border border-white/70 bg-white/80 px-2.5 py-2 hover:border-violet-200 hover:bg-white transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-xs text-slate-800 line-clamp-2">
                                        {news.title}
                                      </p>
                                      <p className="mt-0.5 text-[11px] text-slate-500">
                                        {news.source} · {news.timeAgo}
                                      </p>
                                    </div>
                                    <ExternalLink className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {allWarnings.length > 0 && (
                        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Advertencias
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {severityCounts.high > 0 && (
                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                  {severityCounts.high} alta
                                </span>
                              )}
                              {severityCounts.medium > 0 && (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                  {severityCounts.medium} media
                                </span>
                              )}
                              {severityCounts.info > 0 && (
                                <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                  {severityCounts.info} info
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {allWarnings.map((warning) => {
                              const severity = classifyWarningSeverity(warning);
                              const styles = severityStyles[severity];
                              const isSelected =
                                selectedWarning?.tripId === trip.id &&
                                selectedWarning.warning === warning;

                              return (
                                <div key={warning}>
                                  <button
                                    type="button"
                                    onClick={() => handleWarningTap(trip, warning)}
                                    className={`w-full text-left rounded-xl border p-2.5 transition-all flex items-start gap-2.5 ${styles.container}`}
                                  >
                                    <div
                                      className={`${styles.iconBg} ${styles.icon} rounded-lg p-1.5 flex-shrink-0`}
                                    >
                                      <SeverityIcon
                                        severity={severity}
                                        className="w-3.5 h-3.5"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[11px] uppercase tracking-wide ${styles.labelText} mb-0.5`}>
                                        {styles.label}
                                      </p>
                                      <p className="text-xs text-slate-700 leading-relaxed">
                                        {warning}
                                      </p>
                                    </div>
                                    <ChevronDown
                                      className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform ${
                                        isSelected ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>

                                  {isSelected && (
                                    <div className="mt-2 ml-9 rounded-xl border border-slate-200 bg-white p-3">
                                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                                        Pronóstico que sustenta la advertencia
                                      </p>

                                      {forecastLoadingTripId === trip.id && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                          <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                                          Consultando clima próximo...
                                        </div>
                                      )}

                                      {forecastErrorByTrip[trip.id] && (
                                        <p className="text-xs text-red-600">
                                          {forecastErrorByTrip[trip.id]}
                                        </p>
                                      )}

                                      {!forecastLoadingTripId && forecastByTrip[trip.id] && (
                                        <div className="space-y-2">
                                          <p className="text-xs text-slate-600">
                                            Próximas horas en{" "}
                                            <strong>
                                              {trip.weatherLocationLabel ??
                                                forecastByTrip[trip.id].city}
                                            </strong>
                                          </p>
                                          <div className="grid grid-cols-2 gap-1.5">
                                            {forecastByTrip[trip.id].remainingHourlyForecast
                                              .slice(0, 4)
                                              .map((hour) => (
                                                <div
                                                  key={hour.time}
                                                  className="bg-slate-50 border border-slate-100 rounded-lg p-2"
                                                >
                                                  <p className="text-xs text-slate-900">
                                                    {formatHour(hour.time)} ·{" "}
                                                    {Math.round(hour.temperatureC)}°
                                                  </p>
                                                  <p className="text-[11px] text-slate-500 truncate">
                                                    {translateCondition(hour.condition)}
                                                  </p>
                                                  <p className="text-[11px] text-blue-600 mt-0.5">
                                                    {hour.chanceOfRain}% lluvia
                                                  </p>
                                                </div>
                                              ))}
                                          </div>
                                          <p className="text-[10px] text-slate-400 leading-tight">
                                            Fuente: WeatherAPI.com. Precisión limitada en
                                            localidades pequeñas; verifica con SMN/Conagua antes
                                            de viajes críticos.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const formCompletion = [
    origin.trim().length > 0,
    destination.trim().length > 0,
    travelDate.length > 0,
    selectedTransport.length > 0,
  ].filter(Boolean).length;
  const progressPercent = (formCompletion / 4) * 100;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-32">
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pt-6 pb-7 text-white">
        <button
          type="button"
          onClick={() => setView("list")}
          className="inline-flex items-center gap-1.5 text-sm text-blue-100 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Mis viajes
        </button>

        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl mb-1">Planificar viaje</h1>
            <p className="text-blue-100 text-sm">
              Completa los detalles y revisaremos el clima y tráfico por ti.
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-2.5 flex-shrink-0">
            <Plane className="w-6 h-6" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-blue-100">
            <span>Progreso</span>
            <span>{formCompletion} de 4 pasos</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 -mt-4 space-y-4">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">
              1
            </div>
            <div>
              <h2 className="text-slate-900">Ruta</h2>
              <p className="text-xs text-slate-500">¿De dónde sales y a dónde vas?</p>
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-12 bottom-12 w-px border-l-2 border-dashed border-slate-300" />

            <div className="space-y-1.5 mb-3">
              <Label htmlFor="origin" className="text-xs uppercase tracking-wide text-slate-500">
                Lugar de salida *
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-100 z-10" />
                <Input
                  id="origin"
                  type="text"
                  placeholder="Ej: Zona 10, Ciudad de Guatemala"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200 focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => openMapPicker("origin")}
                className="ml-10 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <MapPin className="w-3.5 h-3.5" />
                Elegir en el mapa
              </button>
            </div>

            <div className="space-y-1.5 mt-4">
              <Label
                htmlFor="destination"
                className="text-xs uppercase tracking-wide text-slate-500"
              >
                Destino *
              </Label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-600 z-10">
                  <Flag className="w-4 h-4" />
                </span>
                <Input
                  id="destination"
                  type="text"
                  placeholder="Ej: Antigua Guatemala"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="pl-10 h-11 bg-white border-slate-200 focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => openMapPicker("destination")}
                className="ml-10 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <MapPin className="w-3.5 h-3.5" />
                Elegir en el mapa
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={checkDestinationWeather}
            disabled={isWeatherLoading}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {isWeatherLoading ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Consultando clima...
              </>
            ) : (
              <>
                <CloudSun className="w-4 h-4" />
                Ver posible clima del destino
              </>
            )}
          </button>

          {weatherError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{weatherError}</span>
            </div>
          )}

          {weatherPreview && (
            <div className="mt-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-blue-100">
                    Clima estimado
                  </p>
                  <p className="text-base truncate">
                    {weatherLocationLabel ?? weatherPreview.city}
                  </p>
                </div>
                <p className="text-3xl font-light flex-shrink-0">
                  {Math.round(weatherPreview.temperatureC)}°
                </p>
              </div>
              <p className="text-sm text-blue-100">
                {translateCondition(weatherPreview.condition)}
              </p>
              <div className="mt-3 pt-3 border-t border-white/15 grid grid-cols-3 gap-2 text-xs text-blue-100">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Sens. {Math.round(weatherPreview.feelsLikeC)}°</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>{weatherPreview.humidity}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5" />
                  <span>{Math.round(weatherPreview.windKph)} km/h</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">
              2
            </div>
            <div>
              <h2 className="text-slate-900">Fecha de viaje</h2>
              <p className="text-xs text-slate-500">¿Cuándo planeas salir?</p>
            </div>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
            <Input
              id="travelDate"
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="pl-10 h-11 bg-white border-slate-200 focus:border-blue-500"
              required
            />
          </div>
          {travelDate && (
            <p className="mt-2 text-xs text-slate-500">
              Salida programada para <strong>{formatTripDate(travelDate)}</strong>
            </p>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">
                3
              </div>
              <div>
                <h2 className="text-slate-900">Medios de transporte</h2>
                <p className="text-xs text-slate-500">Selecciona uno o varios</p>
              </div>
            </div>
            <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
              {selectedTransport.length} seleccionado
              {selectedTransport.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {transportOptions.map(({ id, label, icon: Icon }) => {
              const isSelected = selectedTransport.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleTransport(id)}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm">{label}</span>
                </button>
              );
            })}
          </div>
          {selectedTransport.length === 0 && (
            <p className="mt-3 text-xs text-red-600 inline-flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Selecciona al menos un medio de transporte
            </p>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-slate-900">Notas adicionales</h2>
              <p className="text-xs text-slate-500">Opcional</p>
            </div>
          </div>

          <Textarea
            id="notes"
            placeholder="Ej: Evitar peajes, salir temprano, viajar con niños..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 bg-white border-slate-200 focus:border-blue-500 resize-none"
          />
        </section>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-5 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
          <div className="max-w-screen-md mx-auto flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setView("list")}
              disabled={isSavingTrip}
              className="h-12 px-4 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-90"
              disabled={selectedTransport.length === 0 || isSavingTrip}
            >
              {isSavingTrip ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Guardando viaje...
                </>
              ) : (
                <>
                  Guardar viaje
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {isSavingTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-75" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg">
                  <LoaderCircle className="w-7 h-7 animate-spin" />
                </div>
              </div>
              <h3 className="text-slate-900 mb-1">Guardando tu viaje</h3>
              <p className="text-sm text-slate-500 mb-4">
                {savingStep || "Procesando información..."}
              </p>
              <div className="w-full space-y-2 text-left">
                {[
                  { label: "Localizando ubicaciones", match: /Localizando/ },
                  { label: "Consultando clima", match: /clima/i },
                  { label: "Analizando tráfico", match: /tráfico/i },
                  { label: "Guardando viaje", match: /Guardando/ },
                ].map((s) => {
                  const active = s.match.test(savingStep);
                  return (
                    <div
                      key={s.label}
                      className={`flex items-center gap-2 text-xs ${
                        active ? "text-blue-700" : "text-slate-400"
                      }`}
                    >
                      {active ? (
                        <LoaderCircle className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                      )}
                      <span>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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
