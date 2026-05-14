// Geocoding via our server-side proxy (which calls Nominatim).
// Routing through the function keeps user IPs off OpenStreetMap's servers.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

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
  const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
  const url = `https://${projectRef}.functions.supabase.co/geocode?q=${encodeURIComponent(query.trim())}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return (await res.json()) as GeocodeResult[];
  } catch {
    return [];
  }
}
