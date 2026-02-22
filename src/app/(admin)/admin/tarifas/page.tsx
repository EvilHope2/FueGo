"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { db } from "@/lib/firebaseClient";
import { callAuthedApi } from "@/lib/api";
import { defaultPricing, normalizePricingDoc, validatePricing } from "@/lib/pricing";
import { PricingSettings } from "@/types";

export default function AdminTarifasPage() {
  const { isAuthorized, loading } = useRoleGuard(["admin"]);
  const [form, setForm] = useState<PricingSettings>(defaultPricing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "settings", "pricing"));
      setForm(normalizePricingDoc(snap.exists() ? (snap.data() as any) : defaultPricing));
    })();
  }, []);

  const canSave = useMemo(() => !validatePricing(form), [form]);

  function updateTimeRule(index: number, key: "name" | "start" | "end" | "multiplier" | "enabled", value: string | number | boolean) {
    setForm((prev) => ({
      ...prev,
      timeRules: prev.timeRules.map((rule, i) => (i === index ? { ...rule, [key]: value } : rule)),
    }));
  }

  function addRule() {
    setForm((prev) => ({
      ...prev,
      timeRules: [...prev.timeRules, { name: "Nueva regla", start: "00:00", end: "00:00", multiplier: 1, enabled: false }],
    }));
  }

  function removeRule(index: number) {
    setForm((prev) => ({
      ...prev,
      timeRules: prev.timeRules.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validatePricing(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await callAuthedApi("/api/admin/pricing", form);
      setSuccess("Tarifas guardadas");
    } catch (err: any) {
      setError(err.message || "No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !isAuthorized) return <main className="p-6">Cargando...</main>;

  return (
    <AppShell title="Admin tarifas" links={[{ href: "/admin/choferes", label: "Choferes" }, { href: "/admin/viajes", label: "Viajes" }]}>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tarifa base</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Base</span>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" type="number" value={form.baseFare} onChange={(e) => setForm((prev) => ({ ...prev, baseFare: Number(e.target.value) }))} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Por km</span>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" type="number" value={form.perKm} onChange={(e) => setForm((prev) => ({ ...prev, perKm: Number(e.target.value) }))} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Minimo</span>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" type="number" value={form.minimumFare} onChange={(e) => setForm((prev) => ({ ...prev, minimumFare: Number(e.target.value) }))} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Redondeo</span>
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.rounding} onChange={(e) => setForm((prev) => ({ ...prev, rounding: Number(e.target.value) }))}>
              {[1, 10, 50, 100].map((step) => (
                <option key={step} value={step}>{step}</option>
              ))}
            </select>
          </label>
        </div>

        <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Nocturno / Reglas horarias</h2>
        <div className="space-y-3">
          {form.timeRules.map((rule, index) => (
            <div key={`rule-${index}`} className="rounded-xl border border-slate-200 p-3">
              <div className="grid gap-2 md:grid-cols-5">
                <input className="rounded-lg border border-slate-200 px-2 py-2 text-sm" value={rule.name} onChange={(e) => updateTimeRule(index, "name", e.target.value)} placeholder="Nombre" />
                <input className="rounded-lg border border-slate-200 px-2 py-2 text-sm" value={rule.start} onChange={(e) => updateTimeRule(index, "start", e.target.value)} placeholder="22:00" />
                <input className="rounded-lg border border-slate-200 px-2 py-2 text-sm" value={rule.end} onChange={(e) => updateTimeRule(index, "end", e.target.value)} placeholder="06:00" />
                <input className="rounded-lg border border-slate-200 px-2 py-2 text-sm" type="number" min="1" max="2" step="0.01" value={rule.multiplier} onChange={(e) => updateTimeRule(index, "multiplier", Number(e.target.value))} placeholder="1.15" />
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-2 text-sm">
                  <input type="checkbox" checked={rule.enabled} onChange={(e) => updateTimeRule(index, "enabled", e.target.checked)} />
                  Habilitada
                </label>
              </div>
              <Button type="button" className="mt-2" variant="secondary" onClick={() => removeRule(index)}>
                Eliminar regla
              </Button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addRule}>
            Agregar regla
          </Button>
        </div>

        <h2 className="pt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Clima (Manual)</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={form.weatherRules.enabled} onChange={(e) => setForm((prev) => ({ ...prev, weatherRules: { ...prev.weatherRules, enabled: e.target.checked } }))} />
            Habilitado
          </label>
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" type="number" min="1" max="2" step="0.01" value={form.weatherRules.multiplier} onChange={(e) => setForm((prev) => ({ ...prev, weatherRules: { ...prev.weatherRules, multiplier: Number(e.target.value) } }))} placeholder="1.20" />
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={form.weatherRules.label} onChange={(e) => setForm((prev) => ({ ...prev, weatherRules: { ...prev.weatherRules, label: e.target.value } }))} placeholder="Viento/Nieve" />
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

        <Button disabled={saving || !canSave} type="submit">
          {saving ? "Guardando..." : "Guardar tarifas"}
        </Button>
      </form>
    </AppShell>
  );
}
