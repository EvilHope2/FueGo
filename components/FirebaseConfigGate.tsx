"use client";

import { firebaseClientStatus } from "@/lib/firebaseClient";

export default function FirebaseConfigGate({ children }: { children: React.ReactNode }) {
  if (firebaseClientStatus.ok) {
    return <>{children}</>;
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
        <h1 className="text-xl font-bold">Configuracion incompleta del sitio</h1>
        <p className="mt-2 text-sm">
          Faltan variables publicas de Firebase en el deploy. Carga las variables `NEXT_PUBLIC_FIREBASE_*` en Netlify y redeploy.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>Hace `Clear cache and deploy site`.</li>
          <li>Verifica que esten en `All scopes`.</li>
          <li>Verifica nombres exactos (sin espacios ni typos).</li>
        </ul>
        <p className="mt-3 rounded-lg bg-white p-3 text-xs font-semibold">{firebaseClientStatus.message}</p>
      </section>
    </main>
  );
}
