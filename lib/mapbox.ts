export type PlaceResult = {
  address: string;
  lat: number;
  lng: number;
  placeType: string;
  text: string;
  isExactAddress: boolean;
};

export type SearchPlaceOptions = {
  proximity?: { lat: number; lng: number } | null;
};

const RIO_GRANDE_BBOX = "-67.89,-53.90,-67.56,-53.65";

function getToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
  return token;
}

export async function searchPlaces(query: string, options?: SearchPlaceOptions): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    autocomplete: "true",
    limit: "5",
    language: "es",
    country: "AR",
    types: "address,street",
    bbox: RIO_GRANDE_BBOX,
    access_token: getToken(),
  });

  if (options?.proximity) {
    params.set("proximity", `${options.proximity.lng},${options.proximity.lat}`);
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json = await res.json();
  return (json.features || [])
    .map((f: any) => ({
      address: f.place_name,
      lng: f.center?.[0],
      lat: f.center?.[1],
      placeType: Array.isArray(f.place_type) ? f.place_type[0] : "unknown",
      text: f.text || f.place_name || "",
      isExactAddress: Array.isArray(f.place_type) && f.place_type.includes("address"),
    }))
    .filter((p: PlaceResult) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
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
