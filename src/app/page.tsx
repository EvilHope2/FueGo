import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-10">
      <section className="rounded-3xl bg-white/85 p-8 shadow-xl backdrop-blur">
        <p className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700">FueGo PWA</p>
        <h1 className="mt-4 text-4xl font-black text-slate-900">Viajes simples en Rio Grande</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Cliente pide viaje, chofer acepta en tiempo real, admin controla choferes y tarifas. Instalable en Android desde Chrome.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white hover:bg-teal-500">
            Ingresar
          </Link>
          <Link href="/cliente/home" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
            Ver como cliente
          </Link>
        </div>
      </section>
    </main>
  );
}

