"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import RideStatusBadge from "@/components/RideStatusBadge";
import { authedFetch } from "@/lib/auth";
import { subscribeRide } from "@/lib/firestore";
import { getRoute } from "@/lib/mapbox";

const MapboxMap = dynamic(() => import("@/components/MapboxMap"), { ssr: false });

const transitions: Record<string, string | null> = {
  accepted: "arriving",
  arriving: "in_progress",
  in_progress: "completed",
};

export default function ChoferRidePage() {
  const params = useParams<{ rideId: string }>();
  const [ride, setRide] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);

  useEffect(() => {
    if (!params.rideId) return;
    return subscribeRide(params.rideId, setRide);
  }, [params.rideId]);

  useEffect(() => {
    if (!ride?.pickup || !ride?.dropoff) return;
    getRoute(ride.pickup, ride.dropoff).then(setRoute).catch(() => setRoute(null));
  }, [ride?.pickup, ride?.dropoff]);

  const nextStatus = useMemo(() => (ride ? transitions[ride.status] || null : null), [ride]);

  if (!ride) return <main className="p-6">Cargando viaje...</main>;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Viaje {params.rideId}</h1>
        <RideStatusBadge status={ride.status} />
      </div>

      <MapboxMap center={{ lat: ride.pickup.lat, lng: ride.pickup.lng }} pickup={ride.pickup} dropoff={ride.dropoff} routeGeoJson={route?.geometryGeoJson || null} />

      <div className="mt-4 flex flex-wrap gap-2">
        {nextStatus ? (
          <button
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => authedFetch("/api/driver/status", { rideId: params.rideId, status: nextStatus })}
          >
            Pasar a {nextStatus}
          </button>
        ) : null}
        <Link className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white" href={`https://www.google.com/maps/dir/?api=1&origin=${ride.pickup.lat},${ride.pickup.lng}&destination=${ride.dropoff.lat},${ride.dropoff.lng}`} target="_blank">
          Abrir navegacion
        </Link>
        <Link className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white" href="/chofer/home">
          Volver
        </Link>
      </div>
    </main>
  );
}
