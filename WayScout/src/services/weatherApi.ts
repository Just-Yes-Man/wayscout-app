export interface CurrentWeather {
  city: string;
  region: string;
  country: string;
  temperatureC: number;
  feelsLikeC: number;
  condition: string;
  humidity: number;
  windKph: number;
  lastUpdated: string;
}

export interface HourlyForecast {
  time: string;
  temperatureC: number;
  chanceOfRain: number;
  willItRain: number;
  precipMm: number;
  condition: string;
}

export interface Next24HoursWeather {
  city: string;
  region: string;
  country: string;
  localTime: string;
  remainingHourlyForecast: HourlyForecast[];
}

export async function getCurrentWeatherByCoordinates(
  latitude: number,
  longitude: number,
): Promise<CurrentWeather> {
  const location = `${latitude},${longitude}`;
  const response = await fetch(
    `/api/weather/current?location=${encodeURIComponent(location)}`,
  );

  if (!response.ok) {
    throw new Error("No se pudo obtener el clima actual.");
  }

  return (await response.json()) as CurrentWeather;
}

export async function getNext24HoursWeatherByCoordinates(
  latitude: number,
  longitude: number,
): Promise<Next24HoursWeather> {
  const location = `${latitude},${longitude}`;
  const response = await fetch(
    `/api/weather/next24h?location=${encodeURIComponent(location)}`,
  );

  if (!response.ok) {
    throw new Error("No se pudo obtener el pronostico de las proximas 24 horas.");
  }

  return (await response.json()) as Next24HoursWeather;
}
