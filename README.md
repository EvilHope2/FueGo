# FueGo (Next.js + Firebase + RTDB + Mapbox)

Aplicacion tipo Uber basica para Rio Grande, Tierra del Fuego.
Este repositorio contiene **solo frontend Next.js** con API Routes server-side.

## Stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS
- Firebase Auth + Firestore + Realtime Database
- Mapbox GL + Geocoding + Directions
- PWA (manifest + service worker)
- Deploy en Netlify

## Estructura
- `app/` rutas UI y `app/api/*/route.ts`
- `components/` mapa, autocomplete, badge
- `lib/` firebase, pricing, guards, presencia, tracking
- `public/` manifest, sw, iconos
- `styles/globals.css`

## Variables de entorno
Copiar `.env.example` a `.env.local` y completar:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (opcional recomendado)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (opcional recomendado)
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (opcional)
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `NEXT_PUBLIC_SUPPORT_WHATSAPP`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Nota clave Admin SDK:
`FIREBASE_ADMIN_PRIVATE_KEY` debe guardarse en una linea con `\\n` y el backend la transforma con `replace(/\\n/g, "\n")`.

## Ejecutar local
```bash
npm install
npm run dev
```

## Build local
```bash
npm run build
```

## Deploy Netlify (paso a paso)
1. Crear sitio en Netlify desde GitHub.
2. Seleccionar este repo.
3. Confirmar que el proyecto use **Root directory vacio** (este Next.js vive en la raiz, no en `/web`).
4. Netlify detecta `netlify.toml`:
   - build command: `npm run build`
   - publish: `.next`
   - plugin: `@netlify/plugin-nextjs`
5. Ir a `Site configuration` -> `Environment variables`.
6. Cargar todas las `NEXT_PUBLIC_FIREBASE_*` + `NEXT_PUBLIC_MAPBOX_TOKEN` + variables Admin.
7. Verificar que queden en `All scopes` y con nombres exactos.
8. Hacer `Clear cache and deploy site`.

Si falta alguna variable publica, la app mostrara:
`Configuracion incompleta del sitio` con el detalle de variables faltantes.

## Debug de env en produccion
- Endpoint protegido (solo admin): `GET /api/debug/env`
- Devuelve solo booleanos:
  - `hasApiKey`
  - `hasAuthDomain`
  - `hasProjectId`
  - `hasAppId`
  - `hasDbUrl`
  - `hasMapboxToken`

## Pricing inicial
Crear doc `settings/pricing` en Firestore:
```json
{
  "baseFare": 900,
  "perKm": 950,
  "minimumFare": 2500,
  "rounding": 50,
  "timeRules": [
    {
      "name": "Nocturno",
      "start": "22:00",
      "end": "06:00",
      "multiplier": 1.15,
      "enabled": true
    }
  ],
  "weatherRules": {
    "enabled": false,
    "mode": "manual",
    "multiplier": 1.2,
    "label": "Clima"
  }
}
```

## Crear Admin
1. Registrar usuario en `/login`.
2. En Firestore, en `users/{uid}`, setear `role: "admin"`.

## Flujo de prueba (2 sesiones)
1. Sesion A (cliente): login -> `/cliente/home` -> elegir origen/destino -> pedir viaje.
2. Sesion B (chofer): login chofer -> `/chofer/home` -> poner Online -> aceptar oferta.
3. Chofer cambia estados en `/chofer/viaje/[rideId]`.
4. Cliente ve status y ubicacion en `/cliente/viaje/[rideId]`.
5. Admin edita tarifas en `/admin/tarifas`.

## API routes implementadas
- `POST /api/estimate`
- `POST /api/rides/create`
- `POST /api/match`
- `POST /api/driver/accept`
- `POST /api/driver/status`

Todas las rutas que usan Admin SDK tienen:
```ts
export const runtime = "nodejs";
```

## Reglas
- Firestore: `firestore.rules`
- RTDB: `database.rules.json`

## PWA
- Manifest: `public/manifest.json`
- Service Worker: `public/sw.js`
- Iconos: `public/icons/*`
- Instalable en Android desde Chrome (`Agregar a pantalla principal`).

## Direcciones aproximadas (Mapbox)
- El formulario usa `calle + altura` para origen y destino.
- Si Mapbox devuelve `address`, se usa punto exacto.
- Si solo devuelve `street`, se permite continuar con punto aproximado y se guarda:
  - `streetName`
  - `streetNumber`
  - `isApproximate=true`
  - `mapboxFeatureType="street"`

