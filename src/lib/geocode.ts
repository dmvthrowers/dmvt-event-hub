// Nominatim (OpenStreetMap) forward geocoder.
// Free, no API key. Be polite: small debounce, descriptive User-Agent via Referer.

export interface GeocodeResult {
  display_name: string;
  lat: number;
  lon: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 4) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: GeocodeResult["address"];
  }>;
  return data.map((d) => ({
    display_name: d.display_name,
    lat: Number(d.lat),
    lon: Number(d.lon),
    address: d.address,
  }));
}
