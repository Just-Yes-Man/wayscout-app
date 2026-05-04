export interface TrafficRoute {
  travelMode: string;
  routeLengthMeters: number;
  travelTimeSeconds: number;
  trafficDelaySeconds: number;
  travelTimeWithTrafficSeconds: number;
  trafficLevel: "low" | "medium" | "high";
  advisory: string;
}

export async function getRouteTraffic(params: {
  originLat: number;
  originLon: number;
  destinationLat: number;
  destinationLon: number;
  travelMode: string;
}): Promise<TrafficRoute> {
  const searchParams = new URLSearchParams({
    originLat: String(params.originLat),
    originLon: String(params.originLon),
    destinationLat: String(params.destinationLat),
    destinationLon: String(params.destinationLon),
    travelMode: params.travelMode,
  });

  const response = await fetch(`/api/traffic/route?${searchParams.toString()}`);

  if (!response.ok) {
    let detail = "No se pudo obtener el trafico de la ruta.";
    try {
      const errorPayload = (await response.json()) as { detail?: string; message?: string };
      detail = errorPayload.detail ?? errorPayload.message ?? detail;
    } catch {
      // Mantener mensaje por defecto si el backend no devolvio JSON.
    }
    throw new Error(detail);
  }

  return (await response.json()) as TrafficRoute;
}
