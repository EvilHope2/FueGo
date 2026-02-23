"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { useRoleGuard } from "@/lib/guards";
import { getRoute } from "@/lib/mapbox";
import { authedFetch } from "@/lib/auth";
import { DEFAULT_CENTER, formatCurrency } from "@/lib/utils";
import { PlacePoint } from "@/lib/types";

const MapboxMap = dynamic(() => import("@/components/MapboxMap"), { ssr: false });

export default function ClienteHomePage() {
  const guard = useRoleGuard(["client"]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [pickup, setPickup] = useState<PlacePoint | null>(null);
  const [dropoff, setDropoff] = useState<PlacePoint | null>(null);
  const [route, setRoute] = useState<any>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCenter({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCenter(DEFAULT_CENTER),
    );
  }, []);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setRoute(null);
      setEstimate(null);
      return;
    }

    (async () => {
      try {
        const routeData = await getRoute(pickup, dropoff);
        setRoute(routeData);
        const estimateData = await authedFetch("/api/estimate", {
          distanceKm: routeData.distanceKm,
          durationMin: routeData.durationMin,
        });
        setEstimate(estimateData);
      } catch (err: any) {
        setError(err.message || "No se pudo calcular el estimado");
      }
    })();
  }, [pickup, dropoff]);

  const canCreateRide = useMemo(
    () => !!pickup && !!dropoff && !!pickup.streetNumber && !!dropoff.streetNumber && !!route && !!estimate,
    [pickup, dropoff, route, estimate],
  );

  async function requestRide() {
    if (!pickup?.streetNumber || !dropoff?.streetNumber) {
      setError("Ingresa la altura (ej. 295) en origen y destino.");
      return;
    }
    if (!canCreateRide) return;

    setLoading(true);
    setError("");
    try {
      const created = await authedFetch<{ rideId: string }>("/api/rides/create", {
        pickup,
        dropoff,
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
      });
      await authedFetch("/api/match", { rideId: created.rideId });
      window.location.href = `/cliente/viaje/${created.rideId}`;
    } catch (err: any) {
      setError(err.message || "No se pudo pedir el viaje");
    } finally {
      setLoading(false);
    }
  }

  if (!guard.allowed) return <main className="p-6">Cargando...</main>;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cliente</h1>
        <Link href="/cliente/historial" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">
          Historial
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <MapboxMap center={pickup || center} pickup={pickup} dropoff={dropoff} routeGeoJson={route?.geometryGeoJson || null} />

        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <PlacesAutocomplete label="Origen" proximity={center} onResolved={setPickup} />
          <PlacesAutocomplete label="Destino" proximity={center} onResolved={setDropoff} />

          <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm">
            {route ? `${route.distanceKm} km - ${route.durationMin} min` : "Selecciona calle y altura para origen y destino"}
          </div>

          <div className="rounded-xl bg-teal-50 px-3 py-2 text-sm">
            <p className="font-semibold">Estimado: {estimate ? formatCurrency(estimate.price) : "-"}</p>
            {estimate?.pricingBreakdown ? (
              <div className="mt-2 space-y-1 text-xs text-slate-700">
                <p>Base: {formatCurrency(estimate.pricingBreakdown.basePrice)}</p>
                {estimate.appliedMultipliers?.time > 1 ? (
                  <p>
                    {estimate.appliedMultipliers.timeRuleName || "Nocturno"} x{estimate.appliedMultipliers.time.toFixed(2)}
                  </p>
                ) : null}
                {estimate.appliedMultipliers?.weather > 1 ? (
                  <p>
                    {estimate.appliedMultipliers.weatherLabel || "Clima"} x{estimate.appliedMultipliers.weather.toFixed(2)}
                  </p>
                ) : null}
                <p className="font-semibold">Total: {formatCurrency(estimate.price)}</p>
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button className="w-full rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white" onClick={requestRide} disabled={!canCreateRide || loading}>
            {loading ? "Creando viaje..." : "Pedir FueGo"}
          </button>
        </section>
      </div>
    </main>
  );
}
