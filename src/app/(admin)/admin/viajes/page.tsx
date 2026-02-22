"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { db } from "@/lib/firebaseClient";

const statuses = ["all", "requested", "offered", "accepted", "arriving", "in_progress", "completed", "canceled"];

export default function AdminViajesPage() {
  const { isAuthorized, loading } = useRoleGuard(["admin"]);
  const [rides, setRides] = useState<any[]>([]);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    return onSnapshot(query(collection(db, "rides"), orderBy("createdAt", "desc"), limit(100)), (snapshot) => {
      setRides(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
  }, []);

  const filtered = status === "all" ? rides : rides.filter((ride) => ride.status === status);

  if (loading || !isAuthorized) return <main className="p-6">Cargando...</main>;

  return (
    <AppShell title="Admin viajes" links={[{ href: "/admin/choferes", label: "Choferes" }, { href: "/admin/tarifas", label: "Tarifas" }]}>
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button key={s} className={`rounded-full px-3 py-1 text-xs font-semibold ${status === s ? "bg-teal-600 text-white" : "bg-white text-slate-600"}`} onClick={() => setStatus(s)}>
              {s}
            </button>
          ))}
        </div>

        {filtered.map((ride) => (
          <article key={ride.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{ride.pickup.address.split(",")[0]} → {ride.dropoff.address.split(",")[0]}</h3>
              <StatusBadge status={ride.status} />
            </div>
            <p className="text-sm text-slate-500">Cliente: {ride.clientId}</p>
            <p className="text-sm text-slate-500">Chofer: {ride.driverId || "sin asignar"}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
