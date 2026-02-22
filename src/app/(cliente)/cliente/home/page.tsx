"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { MapboxMap } from "@/components/MapboxMap";
import { Button } from "@/components/ui/Button";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuth } from "@/providers/AuthProvider";
import { RG_DEFAULT_CENTER } from "@/lib/constants";
import { callAuthedApi } from "@/lib/api";
import { getRoute, PlaceResult, searchPlaces } from "@/lib/mapbox";

type EstimateResponse = {
  estimate: {
    distanceKm: number;
    durationMin: number;
    price: number;
    pricingBreakdown: {
      basePrice: number;
      timeMultiplier: number;
      weatherMultiplier: number;
      timeRuleName?: string;
      weatherLabel?: string;
    };
    appliedMultipliers: {
      time: number;
      weather: number;
      timeRuleName?: string;
      weatherLabel?: string;
    };
  };
  badges: {
    time: string | null;
    weather: string | null;
  };
};

function PlaceAutocompleteInput({
  label,
  value,
  onValueChange,
  onPick,
  results,
  loading,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  onPick: (place: PlaceResult) => void;
  results: PlaceResult[];
  loading: boolean;
}) {
  return (
    <div className="relative space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none ring-teal-500 focus:ring"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Buscar direccion"
      />
      {!!results.length ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.map((option, index) => (
            <button
              key={`${option.address}-${index}`}
              type="button"
              className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => onPick(option)}
            >
              {option.address}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? <p className="text-xs text-slate-500">Buscando...</p> : null}
    </div>
  );
}

export default function ClienteHomePage() {
  const { isAuthorized, loading } = useRoleGuard(["client"]);
  const { user } = useAuth();
  const [pickup, setPickup] = useState<PlaceResult | null>(null);
  const [dropoff, setDropoff] = useState<PlaceResult | null>(null);
  const [pickupQuery, setPickupQuery] = useState("");
  const [dropoffQuery, setDropoffQuery] = useState("");
  const [pickupResults, setPickupResults] = useState<PlaceResult[]>([]);
  const [dropoffResults, setDropoffResults] = useState<PlaceResult[]>([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [dropoffLoading, setDropoffLoading] = useState(false);
  const [route, setRoute] = useState<{ distanceKm: number; durationMin: number; geometryGeoJson: import("geojson").LineString } | null>(null);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [center, setCenter] = useState(RG_DEFAULT_CENTER);
  const router = useRouter();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setCenter(RG_DEFAULT_CENTER);
      },
    );
  }, []);

  useEffect(() => {
    const query = pickupQuery.trim();
    if (query.length < 3 || (pickup && query === pickup.address)) {
      setPickupResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setPickupLoading(true);
      const results = await searchPlaces(query);
      setPickupResults(results);
      setPickupLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [pickup, pickupQuery]);

  useEffect(() => {
    const query = dropoffQuery.trim();
    if (query.length < 3 || (dropoff && query === dropoff.address)) {
      setDropoffResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setDropoffLoading(true);
      const results = await searchPlaces(query);
      setDropoffResults(results);
      setDropoffLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [dropoff, dropoffQuery]);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setRoute(null);
      setEstimate(null);
      return;
    }

    const timer = setTimeout(async () => {
      setError("");
      try {
        const resolvedRoute = await getRoute(pickup, dropoff);
        setRoute(resolvedRoute);
      } catch (err: any) {
        setError(err.message || "No se pudo calcular la ruta");
        setRoute(null);
        setEstimate(null);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [dropoff, pickup]);

  useEffect(() => {
    if (!user || !route) {
      setEstimate(null);
      return;
    }

    const timer = setTimeout(async () => {
      setEstimating(true);
      setError("");
      try {
        const data = await callAuthedApi<EstimateResponse>("/api/estimate", {
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
        });
        setEstimate(data);
      } catch (err: any) {
        setError(err.message || "No se pudo calcular el estimado");
      } finally {
        setEstimating(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [route, user]);

  const canRequest = useMemo(() => !!pickup && !!dropoff && !!route && !!estimate, [pickup, dropoff, route, estimate]);

  async function handleRequestRide() {
    if (!pickup || !dropoff || !route || !estimate) return;

    setSubmitting(true);
    setError("");
    try {
      const createResponse = await callAuthedApi<{ rideId: string }>("/api/rides/create", {
        pickup,
        dropoff,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
      });

      await callAuthedApi("/api/match", { rideId: createResponse.rideId, radiusKm: 2 });
      router.push(`/cliente/viaje/${createResponse.rideId}`);
    } catch (err: any) {
      setError(err.message || "No se pudo crear el viaje");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !isAuthorized) {
    return <main className="p-6">Cargando...</main>;
  }

  const breakdown = estimate?.estimate.pricingBreakdown;

  return (
    <AppShell
      title="Cliente"
      subtitle="Pedi tu FueGo"
      links={[
        { href: "/cliente/home", label: "Nuevo viaje" },
        { href: "/cliente/historial", label: "Historial" },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <MapboxMap center={pickup ? { lat: pickup.lat, lng: pickup.lng } : center} pickup={pickup} dropoff={dropoff} routeGeoJson={route?.geometryGeoJson || null} />
        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-md">
          <PlaceAutocompleteInput
            label="Origen"
            value={pickupQuery}
            onValueChange={(value) => {
              setPickupQuery(value);
              setPickup(null);
            }}
            onPick={(place) => {
              setPickup(place);
              setPickupQuery(place.address);
              setPickupResults([]);
            }}
            results={pickupResults}
            loading={pickupLoading}
          />

          <PlaceAutocompleteInput
            label="Destino"
            value={dropoffQuery}
            onValueChange={(value) => {
              setDropoffQuery(value);
              setDropoff(null);
            }}
            onPick={(place) => {
              setDropoff(place);
              setDropoffQuery(place.address);
              setDropoffResults([]);
            }}
            results={dropoffResults}
            loading={dropoffLoading}
          />

          <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {route ? `Distancia ${route.distanceKm.toFixed(2)} km • ${route.durationMin} min` : "Selecciona origen y destino"}
          </p>

          <div className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800">
            <p className="font-semibold">Estimado: {estimate ? `$${estimate.estimate.price.toLocaleString("es-AR")}` : estimating ? "Calculando..." : "Completá dirección"}</p>
            {breakdown ? (
              <div className="mt-2 space-y-1 text-xs">
                <p>Base: ${Math.round(breakdown.basePrice).toLocaleString("es-AR")}</p>
                {breakdown.timeMultiplier > 1 ? <p>{breakdown.timeRuleName || "Nocturno"} (x{breakdown.timeMultiplier.toFixed(2)})</p> : null}
                {breakdown.weatherMultiplier > 1 ? <p>{breakdown.weatherLabel || "Clima"} (x{breakdown.weatherMultiplier.toFixed(2)})</p> : null}
                <p className="font-semibold">Total: ${estimate.estimate.price.toLocaleString("es-AR")}</p>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            {estimate?.badges.time ? <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">{estimate.badges.time}</span> : null}
            {estimate?.badges.weather ? <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700">{estimate.badges.weather}</span> : null}
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button className="w-full" disabled={!canRequest || submitting || estimating} onClick={handleRequestRide}>
            {submitting ? "Buscando chofer..." : "Pedir FueGo"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

