"use client";

import { useEffect, useState } from "react";
import { collection, getDoc, onSnapshot, orderBy, query, doc } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { db } from "@/lib/firebaseClient";
import { callAuthedApi } from "@/lib/api";

export default function AdminChoferesPage() {
  const { isAuthorized, loading } = useRoleGuard(["admin"]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    return onSnapshot(query(collection(db, "drivers"), orderBy("status"), orderBy("lastSeenAt", "desc")), async (snapshot) => {
      const enriched = await Promise.all(
        snapshot.docs.map(async (driverDoc) => {
          const profileSnap = await getDoc(doc(db, "users", driverDoc.id));
          return {
            id: driverDoc.id,
            ...(driverDoc.data() as any),
            user: profileSnap.exists() ? profileSnap.data() : null,
          };
        }),
      );
      setDrivers(enriched);
    });
  }, []);

  if (loading || !isAuthorized) return <main className="p-6">Cargando...</main>;

  return (
    <AppShell
      title="Admin choferes"
      links={[
        { href: "/admin/choferes", label: "Choferes" },
        { href: "/admin/viajes", label: "Viajes" },
        { href: "/admin/tarifas", label: "Tarifas" },
      ]}
    >
      <section className="space-y-3">
        {drivers.map((driver) => (
          <article key={driver.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{driver.user?.name || "Sin nombre"}</p>
                <p className="text-xs text-slate-500">{driver.user?.phone || "sin teléfono"}</p>
              </div>
              <StatusBadge status={driver.status} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => callAuthedApi("/api/admin/driver-status", { driverId: driver.id, status: "approved" })}>
                Aprobar
              </Button>
              <Button variant="secondary" onClick={() => callAuthedApi("/api/admin/driver-status", { driverId: driver.id, status: "pending" })}>
                Pendiente
              </Button>
              <Button variant="danger" onClick={() => callAuthedApi("/api/admin/driver-status", { driverId: driver.id, status: "blocked" })}>
                Bloquear
              </Button>
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
