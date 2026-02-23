"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RideStatusBadge from "@/components/RideStatusBadge";
import { useAuth } from "@/components/AuthProvider";
import { subscribeClientRides } from "@/lib/firestore";

export default function ClienteHistorialPage() {
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return subscribeClientRides(user.uid, setRides);
  }, [user]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Historial</h1>
        <Link href="/cliente/home" className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">Nuevo viaje</Link>
      </div>
      <div className="space-y-3">
        {rides.map((ride) => (
          <Link key={ride.id} href={`/cliente/viaje/${ride.id}`} className="block rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{ride.pickup?.address}</p>
              <RideStatusBadge status={ride.status} />
            </div>
            <p className="text-sm text-slate-600">{ride.dropoff?.address}</p>
          </Link>
        ))}
        {!rides.length ? <p className="text-slate-500">Todavia no hay viajes.</p> : null}
      </div>
    </main>
  );
}

