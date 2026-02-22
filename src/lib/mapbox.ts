import type { LineString } from "geojson";

export type PlaceResult = {
  address: string;
  lat: number;
  lng: number;
};

const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
const CACHE_TTL_MS = 60_000;
const placeCache = new Map<string, { expiresAt: number; data: PlaceResult[] }>();
const inflight = new Map<string, Promise<PlaceResult[]>>();

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized || normalized.length < 3 || !token) {
    return [];
  }

  const now = Date.now();
  const cached = placeCache.get(normalized);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inflightReq = inflight.get(normalized);
  if (inflightReq) {
    return inflightReq;
  }

  const request = (async () => {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      normalized,
    )}.json?autocomplete=true&limit=5&language=es&country=AR&access_token=${token}`;

    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }

    const json = await response.json();
    const features = Array.isArray(json.features) ? json.features : [];

    const data = features
      .map((feature: any) => ({
        address: feature.place_name,
        lng: feature.center?.[0],
        lat: feature.center?.[1],
      }))
      .filter((p: PlaceResult) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !!p.address);

    placeCache.set(normalized, { expiresAt: now + CACHE_TTL_MS, data });
    return data;
  })();

  inflight.set(normalized, request);
  try {
    return await request;
  } finally {
    inflight.delete(normalized);
  }
}

export async function getRoute(pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number }) {
  if (!token) {
    throw new Error("Falta NEXT_PUBLIC_MAPBOX_TOKEN");
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?geometries=geojson&overview=full&language=es&access_token=${token}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("No se pudo calcular la ruta");
  }

  const json = await response.json();
  const route = json.routes?.[0];
  if (!route?.geometry) {
    throw new Error("Ruta no disponible");
  }

  return {
    distanceKm: Number(((route.distance || 0) / 1000).toFixed(2)),
    durationMin: Math.round((route.duration || 0) / 60),
    geometryGeoJson: route.geometry as LineString,
  };
}
