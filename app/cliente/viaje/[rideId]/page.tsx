"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RideStatusBadge from "@/components/RideStatusBadge";
import { listenDriverLocation } from "@/lib/rtdbClient";
import { subscribeRide } from "@/lib/firestore";
import { SUPPORT_WHATSAPP } from "@/lib/utils";

const MapboxMap = dynamic(() => import("@/components/MapboxMap"), { ssr: false });

export default function ClienteRidePage() {
  const params = useParams<{ rideId: string }>();
  const [ride, setRide] = useState<any>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!params.rideId) return;
    return subscribeRide(params.rideId, setRide);
  }, [params.rideId]);

  useEffect(() => {
    if (!ride?.driverId) return;
    return listenDriverLocation(ride.driverId, setDriverLoc);
  }, [ride?.driverId]);

  if (!ride) return <main className="p-6">Cargando viaje...</main>;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Viaje {params.rideId}</h1>
        <RideStatusBadge status={ride.status} />
      </div>

      <MapboxMap
        center={{ lat: ride.pickup.lat, lng: ride.pickup.lng }}
        pickup={ride.pickup}
        dropoff={ride.dropoff}
        driverLocation={driverLoc}
      />

      <div className="mt-4 space-y-2 rounded-2xl bg-white p-4 shadow-sm">
        <p><span className="font-semibold">Origen:</span> {ride.pickup.address}</p>
        <p><span className="font-semibold">Destino:</span> {ride.dropoff.address}</p>
        <p><span className="font-semibold">Precio:</span> ${ride.estimate?.price?.toLocaleString("es-AR")}</p>
        <div className="flex gap-2">
          <Link className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white" href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}`} target="_blank">
            WhatsApp soporte
          </Link>
          <Link className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white" href="/cliente/home">
            Volver
          </Link>
        </div>
      </div>
    </main>
  );
}
