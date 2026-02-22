"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"client" | "driver">("client");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const router = useRouter();
  const next = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("next") || "";
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        await register({ email, password, name, role, phone });
      } else {
        await login({ email, password });
      }

      router.push(next || "/");
    } catch (err: any) {
      setError(err.message || "No se pudo autenticar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-900">FueGo</h1>
        <p className="text-sm text-slate-500">Acceso para cliente, chofer y admin.</p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button type="button" className={`rounded-lg py-2 text-sm ${mode === "login" ? "bg-white font-semibold" : "text-slate-500"}`} onClick={() => setMode("login")}>
            Ingresar
          </button>
          <button type="button" className={`rounded-lg py-2 text-sm ${mode === "register" ? "bg-white font-semibold" : "text-slate-500"}`} onClick={() => setMode("register")}>
            Registro
          </button>
        </div>

        {mode === "register" ? (
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" placeholder="Telefono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRole("client")} className={`rounded-xl border px-3 py-2 text-sm ${role === "client" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200"}`}>
                Cliente
              </button>
              <button type="button" onClick={() => setRole("driver")} className={`rounded-xl border px-3 py-2 text-sm ${role === "driver" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200"}`}>
                Chofer
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" className="mt-4 w-full" disabled={submitting}>
          {submitting ? "Procesando..." : mode === "register" ? "Crear cuenta" : "Ingresar"}
        </Button>
      </form>
    </main>
  );
}

