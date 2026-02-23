"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import RideStatusBadge from "@/components/RideStatusBadge";
import { authedFetch } from "@/lib/auth";
import { subscribeDriverOffers } from "@/lib/firestore";
import { useRoleGuard } from "@/lib/guards";
import { startDriverLocationTracking } from "@/lib/locationTracking";
import { heartbeatPresence, setDriverOffline, setDriverOnline } from "@/lib/presence";

export default function ChoferHomePage() {
  const guard = useRoleGuard(["driver"]);
  const { user } = useAuth();
  const [online, setOnline] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    return subscribeDriverOffers(user.uid, setOffers);
  }, [user]);

  useEffect(() => {
    if (!user || !online) return;
    let stopTracking = () => {};
    let timer = 0;

    (async () => {
      await setDriverOnline(user.uid);
      stopTracking = startDriverLocationTracking(user.uid);
      timer = heartbeatPresence(user.uid);
    })().catch(() => {});

    return () => {
      stopTracking();
      if (timer) clearInterval(timer);
      setDriverOffline(user.uid).catch(() => {});
    };
  }, [online, user]);

  if (!guard.allowed) return <main className="p-6">Cargando...</main>;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chofer</h1>
        <button className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${online ? "bg-emerald-600" : "bg-slate-700"}`} onClick={() => setOnline((v) => !v)}>
          {online ? "Online" : "Offline"}
        </button>
      </div>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <section className="space-y-3">
        {offers.map((item) => (
          <div key={item.rideId} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Oferta #{item.rideId}</p>
              <RideStatusBadge status={item.ride.status} />
            </div>
            <p className="text-sm text-slate-600">{item.ride.pickup?.address}</p>
            <p className="text-sm text-slate-600">{item.ride.dropoff?.address}</p>
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  try {
                    await authedFetch("/api/driver/accept", { rideId: item.rideId });
                    window.location.href = `/chofer/viaje/${item.rideId}`;
                  } catch (err: any) {
                    setError(err.message || "No se pudo aceptar");
                  }
                }}
              >
                Aceptar
              </button>
              <Link href={`/chofer/viaje/${item.rideId}`} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Ver
              </Link>
            </div>
          </div>
        ))}
        {!offers.length ? <p className="text-slate-500">No hay ofertas pendientes.</p> : null}
      </section>
    </main>
  );
}

