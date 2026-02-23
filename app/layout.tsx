import type { Metadata } from "next";
import "@/styles/globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import ServiceWorkerInit from "@/components/ServiceWorkerInit";

export const metadata: Metadata = {
  title: "FueGo",
  description: "Movilidad en Rio Grande, Tierra del Fuego",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ServiceWorkerInit />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

