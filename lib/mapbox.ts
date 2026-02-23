export type PlaceResult = {
  address: string;
  lat: number;
  lng: number;
};

function getToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
  return token;
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?autocomplete=true&limit=5&language=es&country=AR&access_token=${getToken()}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();

  return (json.features || []).map((f: any) => ({
    address: f.place_name,
    lng: f.center?.[0],
    lat: f.center?.[1],
  }));
}

export async function getRoute(pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?geometries=geojson&overview=full&access_token=${getToken()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo calcular la ruta");
  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) throw new Error("Ruta no disponible");

  return {
    distanceKm: Number((route.distance / 1000).toFixed(2)),
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    geometryGeoJson: route.geometry,
  };
}

