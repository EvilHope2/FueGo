"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { db } from "@/lib/firebaseClient";
import { useAuth } from "@/providers/AuthProvider";
import { callAuthedApi } from "@/lib/api";
import {
  listenDriverOffers,
  listenDriverPresence,
  setDriverOffline,
  setDriverOnline,
  startLocationTracking,
} from "@/lib/rtdbClient";

export default function ChoferHomePage() {
  const { isAuthorized, loading } = useRoleGuard(["driver"]);
  const { user } = useAuth();
  const [online, setOnline] = useState(false);
  const [driverStatus, setDriverStatus] = useState("pending");
  const [offers, setOffers] = useState<any[]>([]);
  const trackingStopRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "drivers", user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      setDriverStatus(data.status || "pending");
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenDriverPresence(user.uid, (presence) => {
      setOnline(!!presence?.online);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenDriverOffers(user.uid, (nextOffers) => {
      setOffers(nextOffers.filter((offer) => offer.status === "sent"));
    });
  }, [user]);

  useEffect(() => {
    if (!user || !online) {
      trackingStopRef.current?.();
      trackingStopRef.current = null;
      return;
    }

    const stop = startLocationTracking(user.uid);
    trackingStopRef.current = stop;

    return () => stop();
  }, [online, user]);

  async function toggleOnline(nextValue: boolean) {
    if (!user) return;

    if (nextValue) {
      await setDriverOnline(user.uid);
      return;
    }

    trackingStopRef.current?.();
    trackingStopRef.current = null;
    await setDriverOffline(user.uid);
  }

  const disabledByStatus = useMemo(() => driverStatus !== "approved", [driverStatus]);

  if (loading || !isAuthorized) return <main className="p-6">Cargando...</main>;

  return (
    <AppShell
      title="Chofer"
      subtitle="Ofertas cercanas y estado"
      links={[
        { href: "/chofer/home", label: "Ofertas" },
        { href: "/chofer/ganancias", label: "Ganancias" },
      ]}
    >
      <section className="space-y-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Estado de cuenta</p>
            <StatusBadge status={driverStatus} />
          </div>
          <Button disabled={disabledByStatus} variant={online ? "danger" : "primary"} onClick={() => toggleOnline(!online)}>
            {online ? "Poner Offline" : "Poner Online"}
          </Button>
        </article>

        <article className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ofertas activas</h2>
          {offers.map((offer) => (
            <div key={offer.rideId} className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold text-slate-900">{offer.pickup?.address?.split(",")[0]} → {offer.dropoff?.address?.split(",")[0]}</p>
              <p className="mt-1 text-sm text-slate-500">${offer.estimate?.price?.toLocaleString("es-AR")}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  className="flex-1"
                  onClick={async () => {
                    await callAuthedApi("/api/driver/accept", { rideId: offer.rideId });
                  }}
                >
                  Aceptar
                </Button>
                <Link href={`/chofer/viaje/${offer.rideId}`} className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Ver
                </Link>
              </div>
            </div>
          ))}
          {!offers.length ? <p className="text-sm text-slate-600">Sin ofertas por ahora.</p> : null}
        </article>
      </section>
    </AppShell>
  );
}
