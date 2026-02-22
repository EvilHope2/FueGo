export const dynamic = "force-static";

export default function manifest() {
  return {
    name: "FueGo",
    short_name: "FueGo",
    description: "Movilidad simple para Rio Grande, Tierra del Fuego",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f766e",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}

