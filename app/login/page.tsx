"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"client" | "driver">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let resolvedRole: "client" | "driver" | "admin" = "client";
      if (mode === "login") {
        resolvedRole = await login(email, password);
      } else {
        resolvedRole = await register(name, email, password, role);
      }
      if (resolvedRole === "driver") router.push("/chofer/home");
      else if (resolvedRole === "admin") router.push("/admin/viajes");
      else router.push("/cliente/home");
    } catch (err: any) {
      setError(err.message || "Error al autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold">{mode === "login" ? "Ingresar" : "Crear cuenta"}</h1>
        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          {mode === "register" ? (
            <input className="w-full rounded-xl border px-3 py-2" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          ) : null}
          <input className="w-full rounded-xl border px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-xl border px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {mode === "register" ? (
            <select className="w-full rounded-xl border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as "client" | "driver")}>
              <option value="client">Cliente</option>
              <option value="driver">Chofer</option>
            </select>
          ) : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button className="w-full rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white" disabled={loading}>
            {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Registrarme"}
          </button>
        </form>
        <button className="mt-3 text-sm text-teal-700" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "No tenes cuenta? Registrate" : "Ya tenes cuenta? Ingresar"}
        </button>
      </div>
    </main>
  );
}

