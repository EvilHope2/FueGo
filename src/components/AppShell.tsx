"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";

export function AppShell({
  title,
  subtitle,
  children,
  links,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  links?: Array<{ href: string; label: string }>;
}) {
  const { profile, logout } = useAuth();

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-5">
      <header className="mb-6 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-800 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-200">{subtitle}</p> : null}
            <p className="mt-1 text-xs uppercase tracking-wide text-teal-200">{profile?.name || "Usuario"}</p>
          </div>
          <Button variant="secondary" onClick={() => logout()}>
            Salir
          </Button>
        </div>
        {links?.length ? (
          <nav className="mt-4 flex flex-wrap gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25">
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      {children}
    </main>
  );
}

