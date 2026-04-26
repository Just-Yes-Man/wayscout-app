import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import {
  getCurrentWeatherByCoordinates,
  type CurrentWeather,
} from "../services/weatherApi";
import { getDeviceLocality } from "../services/locationApi";
import {
  Bell,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CloudRain,
  Car,
  CheckCircle2,
  TrendingUp,
  LoaderCircle,
} from "lucide-react";

type EventType = "deslave" | "trafico" | "clima";
type EventSource = "verified" | "user";

interface Event {
  id: string;
  type: EventType;
  title: string;
  location: string;
  time: string;
  source: EventSource;
  verified: boolean;
  votes: { up: number; down: number };
  description: string;
}

const mockEvents: Event[] = [
  {
    id: "1",
    type: "deslave",
    title: "Deslave en Autopista Norte",
    location: "Km 45, Autopista Norte",
    time: "Hace 15 min",
    source: "verified",
    verified: true,
    votes: { up: 124, down: 3 },
    description: "Carril izquierdo bloqueado por derrumbe",
  },
  {
    id: "2",
    type: "trafico",
    title: "Tráfico Pesado",
    location: "Av. Principal, Centro",
    time: "Hace 30 min",
    source: "user",
    verified: false,
    votes: { up: 45, down: 2 },
    description: "Congestión vehicular por accidente",
  },
  {
    id: "3",
    type: "clima",
    title: "Lluvia Intensa",
    location: "Zona Sur",
    time: "Hace 45 min",
    source: "verified",
    verified: true,
    votes: { up: 89, down: 1 },
    description: "Visibilidad reducida y calzada resbaladiza",
  },
  {
    id: "4",
    type: "deslave",
    title: "Vía Obstruida",
    location: "Carretera La Montaña",
    time: "Hace 1 hora",
    source: "user",
    verified: false,
    votes: { up: 67, down: 5 },
    description: "Piedras en la vía, precaución",
  },
];

export function Home() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | EventType>("all");
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(
    null,
  );
  const [deviceLocality, setDeviceLocality] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setWeatherLoading(false);
      setWeatherError("Tu dispositivo no soporta geolocalizacion.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const [weather, locality] = await Promise.all([
            getCurrentWeatherByCoordinates(coords.latitude, coords.longitude),
            getDeviceLocality(coords.latitude, coords.longitude),
          ]);

          setCurrentWeather(weather);
          setDeviceLocality(locality);
          setWeatherError(null);
        } catch {
          try {
            const weather = await getCurrentWeatherByCoordinates(
              coords.latitude,
              coords.longitude,
            );

            setCurrentWeather(weather);
            setWeatherError(null);
          } catch {
            setWeatherError("No fue posible cargar el clima actual.");
          }
        } finally {
          setWeatherLoading(false);
        }
      },
      () => {
        setWeatherLoading(false);
        setWeatherError(
          "Permite la ubicacion para ver el clima actual de tu zona.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }, []);

  const displayLocality = deviceLocality ?? currentWeather?.city;

  useEffect(() => {
    if (deviceLocality || !currentWeather) {
      return;
    }

    setDeviceLocality(currentWeather.city);
  }, [deviceLocality, currentWeather]);

  useEffect(() => {
    if (!currentWeather) {
      return;
    }

    if (weatherError) {
      setWeatherError(null);
    }
  }, [currentWeather, weatherError]);

  const weatherSubtitle =
    deviceLocality && currentWeather
      ? `${currentWeather.condition} - clima por coordenadas`
      : currentWeather?.condition;

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case "deslave":
        return <AlertTriangle className="w-5 h-5" />;
      case "trafico":
        return <Car className="w-5 h-5" />;
      case "clima":
        return <CloudRain className="w-5 h-5" />;
    }
  };

  const getEventColor = (type: EventType) => {
    switch (type) {
      case "deslave":
        return "bg-red-500";
      case "trafico":
        return "bg-amber-500";
      case "clima":
        return "bg-blue-500";
    }
  };

  const filteredEvents =
    filter === "all"
      ? mockEvents
      : mockEvents.filter((event) => event.type === filter);

  return (
    <div className="pb-4">
      {/* Header - blanco limpio, el azul queda como acento */}
      <div className="bg-white px-6 pt-6 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl mb-0.5 text-slate-900">WayScout</h1>
            <p className="text-slate-500 text-sm">Alertas en tu ruta</p>
          </div>
          <button className="relative p-2.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>
        </div>

        {/* Tarjeta de clima - aquí sí usamos azul de marca con gradiente para darle profundidad */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-4 shadow-sm">
          {weatherLoading && (
            <div className="flex items-center gap-2 text-blue-50 text-sm">
              <LoaderCircle className="w-4 h-4 animate-spin" />
              <span>Obteniendo clima de tu ubicacion...</span>
            </div>
          )}

          {!weatherLoading && weatherError && (
            <p className="text-sm text-blue-50">{weatherError}</p>
          )}

          {!weatherLoading && !weatherError && currentWeather && (
            <div>
              <p className="text-blue-100 text-xs mb-1 uppercase tracking-wide">
                Clima actual
              </p>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-lg">{displayLocality}</p>
                  <p className="text-sm text-blue-100">{weatherSubtitle}</p>
                </div>
                <p className="text-4xl font-light">
                  {Math.round(currentWeather.temperatureC)}°
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-white/15 text-xs text-blue-100 flex items-center gap-4">
                <span>Sensacion: {Math.round(currentWeather.feelsLikeC)}°</span>
                <span>Humedad: {currentWeather.humidity}%</span>
                <span>Viento: {Math.round(currentWeather.windKph)} km/h</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats - neutros con acento de color en el icono */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-2xl text-slate-900">12</span>
            </div>
            <p className="text-xs text-slate-500">Activas hoy</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-2xl text-slate-900">3</span>
            </div>
            <p className="text-xs text-slate-500">En tu área</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-2xl text-slate-900">8</span>
            </div>
            <p className="text-xs text-slate-500">Verificadas</p>
          </div>
        </div>
      </div>

      {/* Filters - activo destaca porque los demás son neutros */}
      <div className="px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("deslave")}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filter === "deslave"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            Deslaves
          </button>
          <button
            onClick={() => setFilter("trafico")}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filter === "trafico"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            Tráfico
          </button>
          <button
            onClick={() => setFilter("clima")}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filter === "clima"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
            }`}
          >
            Clima
          </button>
        </div>
      </div>

      {/* Events List - tarjetas neutras, el color solo vive en el icono del tipo */}
      <div className="px-4 space-y-3">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            onClick={() => navigate(`/event/${event.id}`)}
            className="bg-white rounded-xl shadow-sm p-4 border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div
                className={`${getEventColor(
                  event.type,
                )} p-3 rounded-full text-white flex-shrink-0`}
              >
                {getEventIcon(event.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-slate-900">{event.title}</h3>
                  {event.verified && (
                    <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-xs flex-shrink-0 hover:bg-blue-50">
                      ✓ Verificado
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>

                <p className="text-sm text-slate-600 mb-3">
                  {event.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{event.time}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-slate-500">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">{event.votes.up}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <ThumbsDown className="w-4 h-4" />
                      <span className="text-sm">{event.votes.down}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}