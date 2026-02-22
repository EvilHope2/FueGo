"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebaseClient";

export default function ChoferGananciasPage() {
  const { isAuthorized, loading } = useRoleGuard(["driver"]);
  const { user } = useAuth();
  const [completed, setCompleted] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, "rides"), where("driverId", "==", user.uid), where("status", "==", "completed")), (snapshot) => {
      setCompleted(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, [user]);

  const total = useMemo(() => completed.reduce((sum, ride) => sum + (ride.final?.price || ride.estimate?.price || 0), 0), [completed]);

  if (loading || !isAuthorized) return <main className="p-6">Cargando...</main>;

  return (
    <AppShell title="Ganancias" links={[{ href: "/chofer/home", label: "Ofertas" }]}>
      <section className="space-y-3">
        <article className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total completado</p>
          <p className="text-3xl font-black text-emerald-700">${total.toLocaleString("es-AR")}</p>
        </article>
        {completed.map((ride) => (
          <article key={ride.id} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900">{ride.pickup.address.split(",")[0]} → {ride.dropoff.address.split(",")[0]}</p>
            <p className="text-sm text-slate-500">${(ride.final?.price || ride.estimate?.price || 0).toLocaleString("es-AR")}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
