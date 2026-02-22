"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { AppShell } from "@/components/AppShell";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { watchClientRideHistory } from "@/lib/rides";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ClienteHistorialPage() {
  const { isAuthorized, loading } = useRoleGuard(["client"]);
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return watchClientRideHistory(user.uid, setRides);
  }, [user]);

  if (loading || !isAuthorized) return <main className="p-6">Cargando...</main>;

  return (
    <AppShell title="Historial" links={[{ href: "/cliente/home", label: "Nuevo viaje" }]}>
      <section className="space-y-3">
        {rides.map((ride) => (
          <Link key={ride.id} href={`/cliente/viaje/${ride.id}`} className="block rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{ride.pickup.address.split(",")[0]} → {ride.dropoff.address.split(",")[0]}</h3>
              <StatusBadge status={ride.status} />
            </div>
            <p className="text-sm text-slate-500">${ride.estimate?.price?.toLocaleString("es-AR")}</p>
          </Link>
        ))}
        {!rides.length ? <p className="rounded-xl bg-white p-4 text-sm text-slate-600">Aún no hay viajes.</p> : null}
      </section>
    </AppShell>
  );
}
