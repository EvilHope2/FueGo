"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import RideStatusBadge from "@/components/RideStatusBadge";
import { useRoleGuard } from "@/lib/guards";
import { firestore } from "@/lib/firebaseClient";

export default function AdminViajesPage() {
  const guard = useRoleGuard(["admin"]);
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    if (!guard.allowed) return;
    getDocs(query(collection(firestore, "rides"), orderBy("createdAt", "desc"), limit(100))).then((snap) => {
      setRides(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [guard.allowed]);

  if (!guard.allowed) return <main className="p-6">Cargando...</main>;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Admin · Viajes</h1>
      <div className="space-y-3">
        {rides.map((ride) => (
          <div key={ride.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{ride.id}</p>
              <RideStatusBadge status={ride.status} />
            </div>
            <p className="text-sm text-slate-600">{ride.pickup?.address}</p>
            <p className="text-sm text-slate-600">{ride.dropoff?.address}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

