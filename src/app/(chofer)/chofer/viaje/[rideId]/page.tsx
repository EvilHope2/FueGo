"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { watchRide } from "@/lib/rides";
import { callAuthedApi } from "@/lib/api";
import { SUPPORT_WHATSAPP } from "@/lib/constants";
import { MapboxMap } from "@/components/MapboxMap";
import { getRoute } from "@/lib/mapbox";

const nextStatusMap: Record<string, string | null> = {
  accepted: "arriving",
  arriving: "in_progress",
  in_progress: "completed",
};

export default function ChoferRidePage() {
  const { isAuthorized, loading } = useRoleGuard(["driver"]);
  const params = useParams<{ rideId: string }>();
  const [ride, setRide] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [routeGeoJson, setRouteGeoJson] = useState<import("geojson").LineString | null>(null);

  useEffect(() => {
    if (!params.rideId) return;
    return watchRide(params.rideId, setRide);
  }, [params.rideId]);

  useEffect(() => {
    if (!ride?.pickup || !ride?.dropoff) {
      setRouteGeoJson(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const route = await getRoute(ride.pickup, ride.dropoff);
        if (!cancelled) {
          setRouteGeoJson(route.geometryGeoJson);
        }
      } catch {
        if (!cancelled) {
          setRouteGeoJson(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ride?.dropoff, ride?.pickup]);

  const nextStatus = useMemo(() => (ride ? nextStatusMap[ride.status] : null), [ride]);

  if (loading || !isAuthorized) return <main className="p-6">Cargando...</main>;
  if (!ride) return <main className="p-6">Cargando viaje...</main>;

  const navigationUrl = `https://www.google.com/maps/dir/?api=1&origin=${ride.pickup.lat},${ride.pickup.lng}&destination=${ride.dropoff.lat},${ride.dropoff.lng}`;

  return (
    <AppShell title="Viaje asignado" links={[{ href: "/chofer/home", label: "Volver" }, { href: "/chofer/ganancias", label: "Ganancias" }]}>
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Ride {params.rideId}</h2>
          <StatusBadge status={ride.status} />
        </div>

        <MapboxMap center={{ lat: ride.pickup.lat, lng: ride.pickup.lng }} pickup={ride.pickup} dropoff={ride.dropoff} routeGeoJson={routeGeoJson} />

        <p className="text-sm text-slate-600">Origen: {ride.pickup.address}</p>
        <p className="text-sm text-slate-600">Destino: {ride.dropoff.address}</p>
        <p className="text-sm font-semibold text-slate-900">Monto: ${ride.estimate?.price?.toLocaleString("es-AR")}</p>

        <div className="flex flex-wrap gap-2">
          {nextStatus ? (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await callAuthedApi("/api/driver/status", { rideId: params.rideId, status: nextStatus });
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Actualizando..." : `Pasar a ${nextStatus}`}
            </Button>
          ) : null}

          {ride.status !== "completed" && ride.status !== "canceled" ? (
            <Button variant="danger" onClick={() => callAuthedApi("/api/driver/status", { rideId: params.rideId, status: "canceled" })}>
              Cancelar
            </Button>
          ) : null}

          <Link href={navigationUrl} target="_blank" className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
            Abrir navegacion
          </Link>

          <Link href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}`} target="_blank" className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white">
            WhatsApp soporte
          </Link>
        </div>
      </section>
    </AppShell>
  );
}

