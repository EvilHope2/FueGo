"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { watchRide } from "@/lib/rides";
import { db } from "@/lib/firebaseClient";
import { SUPPORT_WHATSAPP } from "@/lib/constants";
import { callAuthedApi } from "@/lib/api";
import { listenDriverLocation, listenRideStatus } from "@/lib/rtdbClient";

export default function ClienteRideDetailPage() {
  const { isAuthorized, loading } = useRoleGuard(["client"]);
  const params = useParams<{ rideId: string }>();
  const [ride, setRide] = useState<any | null>(null);
  const [rideStatus, setRideStatus] = useState<any | null>(null);
  const [driver, setDriver] = useState<any | null>(null);
  const [driverLocation, setDriverLocation] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!params.rideId) return;
    return watchRide(params.rideId, setRide);
  }, [params.rideId]);

  useEffect(() => {
    if (!params.rideId) return;
    return listenRideStatus(params.rideId, setRideStatus);
  }, [params.rideId]);

  useEffect(() => {
    (async () => {
      const nextDriverId = rideStatus?.driverId || ride?.driverId;
      if (!nextDriverId) {
        setDriver(null);
        return;
      }
      const userSnap = await getDoc(doc(db, "users", nextDriverId));
      setDriver(userSnap.exists() ? userSnap.data() : null);
    })();
  }, [ride?.driverId, rideStatus?.driverId]);

  useEffect(() => {
    const nextDriverId = rideStatus?.driverId || ride?.driverId;
    if (!nextDriverId) {
      setDriverLocation(null);
      return;
    }

    return listenDriverLocation(nextDriverId, setDriverLocation);
  }, [ride?.driverId, rideStatus?.driverId]);

  if (loading || !isAuthorized) return <main className="p-6">Cargando...</main>;
  if (!ride) return <main className="p-6">Cargando viaje...</main>;

  const currentStatus = rideStatus?.status || ride.status;
  const driverPhone = driver?.phone || SUPPORT_WHATSAPP;
  const waText = encodeURIComponent(`Hola, soy cliente de FueGo. Ride ${params.rideId}`);

  return (
    <AppShell
      title="Tu viaje"
      links={[
        { href: "/cliente/home", label: "Nuevo viaje" },
        { href: "/cliente/historial", label: "Historial" },
      ]}
    >
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Estado actual</h2>
          <StatusBadge status={currentStatus} />
        </div>
        <p className="text-sm text-slate-600">Origen: {ride.pickup.address}</p>
        <p className="text-sm text-slate-600">Destino: {ride.dropoff.address}</p>
        <p className="text-sm font-semibold text-slate-900">Estimado: ${ride.estimate?.price?.toLocaleString("es-AR")}</p>

        {driverLocation ? (
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
            Ubicacion chofer: {driverLocation.lat?.toFixed(5)}, {driverLocation.lng?.toFixed(5)}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white" href={`https://wa.me/${driverPhone.replace(/\D/g, "")}?text=${waText}`} target="_blank">
            WhatsApp chofer/soporte
          </Link>
          <Link className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" href={`tel:${driverPhone}`}>
            Llamar
          </Link>
          {currentStatus === "requested" || currentStatus === "offered" ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await callAuthedApi("/api/match", { rideId: params.rideId, radiusKm: 5 });
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Reintentando..." : "Reintentar búsqueda"}
            </Button>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
