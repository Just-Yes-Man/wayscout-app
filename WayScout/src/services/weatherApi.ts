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