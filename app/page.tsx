import Link from "next/link";

export default function LandingPage() {
  // Temporary server-side diagnostics: prints only booleans, never secret values.
  // Useful to detect env propagation issues in hosted builds.
  // eslint-disable-next-line no-console
  console.info("[FueGo env check]", {
    hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    hasDbUrl: !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <section className="rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-700 p-10 text-white shadow-xl">
        <h1 className="text-4xl font-bold">FueGo</h1>
        <p className="mt-3 text-teal-50">Viajes urbanos en Rio Grande, rapido y simple.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/login" className="rounded-xl bg-white px-5 py-3 font-semibold text-teal-700">
            Ingresar
          </Link>
          <Link href="/cliente/home" className="rounded-xl border border-white/40 px-5 py-3 font-semibold">
            Ir a Cliente
          </Link>
        </div>
      </section>
    </main>
  );
}

