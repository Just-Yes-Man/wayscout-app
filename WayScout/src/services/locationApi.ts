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