"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRoleGuard } from "@/lib/guards";
import { firestore } from "@/lib/firebaseClient";
import { normalizePricing } from "@/lib/pricing";

export default function AdminTarifasPage() {
  const guard = useRoleGuard(["admin"]);
  const [pricing, setPricing] = useState<any>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!guard.allowed) return;
    getDoc(doc(firestore, "settings", "pricing")).then((snap) => setPricing(normalizePricing(snap.data() as any)));
  }, [guard.allowed]);

  async function save() {
    if (!pricing) return;
    await setDoc(doc(firestore, "settings", "pricing"), pricing, { merge: true });
    setMsg("Guardado");
  }

  if (!guard.allowed || !pricing) return <main className="p-6">Cargando...</main>;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Admin · Tarifas</h1>
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <input className="w-full rounded-xl border px-3 py-2" type="number" value={pricing.baseFare} onChange={(e) => setPricing({ ...pricing, baseFare: Number(e.target.value) })} placeholder="Base fare" />
        <input className="w-full rounded-xl border px-3 py-2" type="number" value={pricing.perKm} onChange={(e) => setPricing({ ...pricing, perKm: Number(e.target.value) })} placeholder="Por km" />
        <input className="w-full rounded-xl border px-3 py-2" type="number" value={pricing.minimumFare} onChange={(e) => setPricing({ ...pricing, minimumFare: Number(e.target.value) })} placeholder="Minimo" />
        <input className="w-full rounded-xl border px-3 py-2" type="number" value={pricing.rounding} onChange={(e) => setPricing({ ...pricing, rounding: Number(e.target.value) })} placeholder="Redondeo" />

        <h2 className="font-semibold">Regla horaria</h2>
        <input className="w-full rounded-xl border px-3 py-2" value={pricing.timeRules[0]?.name || ""} onChange={(e) => setPricing({ ...pricing, timeRules: [{ ...(pricing.timeRules[0] || {}), name: e.target.value }] })} placeholder="Nombre" />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-xl border px-3 py-2" value={pricing.timeRules[0]?.start || "22:00"} onChange={(e) => setPricing({ ...pricing, timeRules: [{ ...(pricing.timeRules[0] || {}), start: e.target.value }] })} placeholder="22:00" />
          <input className="rounded-xl border px-3 py-2" value={pricing.timeRules[0]?.end || "06:00"} onChange={(e) => setPricing({ ...pricing, timeRules: [{ ...(pricing.timeRules[0] || {}), end: e.target.value }] })} placeholder="06:00" />
        </div>
        <input className="w-full rounded-xl border px-3 py-2" type="number" step="0.01" value={pricing.timeRules[0]?.multiplier || 1} onChange={(e) => setPricing({ ...pricing, timeRules: [{ ...(pricing.timeRules[0] || {}), multiplier: Number(e.target.value), enabled: true }] })} placeholder="1.15" />

        <h2 className="font-semibold">Clima manual</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pricing.weatherRules.enabled} onChange={(e) => setPricing({ ...pricing, weatherRules: { ...pricing.weatherRules, enabled: e.target.checked } })} /> Habilitado</label>
        <input className="w-full rounded-xl border px-3 py-2" type="number" step="0.01" value={pricing.weatherRules.multiplier} onChange={(e) => setPricing({ ...pricing, weatherRules: { ...pricing.weatherRules, multiplier: Number(e.target.value) } })} />
        <input className="w-full rounded-xl border px-3 py-2" value={pricing.weatherRules.label} onChange={(e) => setPricing({ ...pricing, weatherRules: { ...pricing.weatherRules, label: e.target.value } })} />

        <button className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white" onClick={save}>Guardar</button>
        {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
      </div>
    </main>
  );
}

