"use client";

import { useEffect, useState } from "react";
import { doc, getDocs, collection, query, where, updateDoc } from "firebase/firestore";
import { useRoleGuard } from "@/lib/guards";
import { firestore } from "@/lib/firebaseClient";

export default function AdminChoferesPage() {
  const guard = useRoleGuard(["admin"]);
  const [drivers, setDrivers] = useState<any[]>([]);

  async function load() {
    const snap = await getDocs(query(collection(firestore, "drivers"), where("status", "==", "pending")));
    setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => {
    if (guard.allowed) load();
  }, [guard.allowed]);

  async function setStatus(id: string, status: "approved" | "blocked") {
    await updateDoc(doc(firestore, "drivers", id), { status, updatedAt: Date.now() });
    await load();
  }

  if (!guard.allowed) return <main className="p-6">Cargando...</main>;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Admin · Choferes</h1>
      <div className="space-y-3">
        {drivers.map((driver) => (
          <div key={driver.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-semibold">{driver.id}</p>
            <p className="text-sm text-slate-600">Estado: {driver.status}</p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => setStatus(driver.id, "approved")}>Aprobar</button>
              <button className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => setStatus(driver.id, "blocked")}>Bloquear</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

