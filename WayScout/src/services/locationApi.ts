interface NominatimAddress {
  neighbourhood?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  county?: string;
  state?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

interface NominatimSearchItem {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  label: string;
}

function pickLocality(address?: NominatimAddress): string | null {
  if (!address) return null;

  const locality =
    address.neighbourhood ||
    address.suburb ||
    address.village ||
    address.town ||
    address.city;

  if (!locality) return null;

  const region = address.county || address.state;
  return region ? `${locality}, ${region}` : locality;
}

export async function getDeviceLocality(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1&accept-language=es`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as NominatimResponse;
  return pickLocality(data.address);
}

export async function geocodeLocation(query: string): Promise<GeocodedLocation | null> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return null;
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(trimmedQuery)}&limit=1&addressdetails=1&accept-language=es`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as NominatimSearchItem[];
  const bestMatch = data[0];

  if (!bestMatch) {
    return null;
  }

  const latitude = Number.parseFloat(bestMatch.lat);
  const longitude = Number.parseFloat(bestMatch.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    label: pickLocality(bestMatch.address) ?? bestMatch.display_name,
  };
}
