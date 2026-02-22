# FueGo

FueGo es una PWA tipo ride-hailing para Rio Grande, Tierra del Fuego.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Firebase Auth
- Firestore (persistente)
- Realtime Database (realtime)
- API routes con Firebase Admin
- Mapbox GL JS + Geocoding + Directions
- PWA con `next-pwa`

## Arquitectura de datos
### Firestore (persistente)
- `users/{uid}`
- `drivers/{uid}` (perfil: estado, vehiculo)
- `rides/{rideId}` (fuente de verdad persistente)
- `settings/pricing`

### RTDB (tiempo real)
- `presence/{driverId}`: `online`, `lastSeenAt`
- `locations/{driverId}`: `lat`, `lng`, `geohash`, `updatedAt`
- `rideOffers/{driverId}/{rideId}`
- `rideStatus/{rideId}`

## Roles y rutas
- Publico: `/`, `/login`
- Cliente: `/cliente/home`, `/cliente/buscando`, `/cliente/viaje/[rideId]`, `/cliente/historial`
- Chofer: `/chofer/home`, `/chofer/viaje/[rideId]`, `/chofer/ganancias`
- Admin: `/admin/choferes`, `/admin/viajes`, `/admin/tarifas`

## Variables de entorno
Copiar `.env.example` a `.env.local`.

### Firebase client
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`

### Firebase Admin (API routes)
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `FIREBASE_ADMIN_DATABASE_URL`

### Mapbox
- `NEXT_PUBLIC_MAPBOX_TOKEN`

### Otros
- `NEXT_PUBLIC_SUPPORT_WHATSAPP`
- `FUEGO_ADMIN_UID` (solo para seed opcional)

## Mapbox token
1. Ir a https://account.mapbox.com/access-tokens/
2. Crear token publico `pk...`
3. Permisos minimos: `styles:read`, `geocoding:read`
4. Guardarlo en `NEXT_PUBLIC_MAPBOX_TOKEN`

## Reglas de seguridad
- Firestore: `firestore.rules`
- RTDB: `database.rules.json`

Publicar reglas RTDB desde Firebase Console o CLI:
```bash
firebase deploy --only database
```

## Endpoints
- `POST /api/estimate`: calcula precio server-side
- `POST /api/rides/create`: crea ride persistente + inicializa `rideStatus` en RTDB
- `POST /api/match`: lee online/locations en RTDB, crea offers en RTDB, actualiza estado en RTDB + Firestore
- `POST /api/driver/accept`: lock por transaccion en Firestore + espejo realtime en RTDB
- `POST /api/driver/status`: avanza estados en Firestore + RTDB

## Flujo realtime
1. Chofer online:
- `setDriverOnline()` en RTDB
- `onDisconnect()` fuerza offline
- `startLocationTracking()` escribe ubicacion + geohash cada cambio
2. Cliente escucha `rideStatus/{rideId}`
3. Chofer escucha `rideOffers/{driverId}`
4. Cliente puede ver ubicacion del chofer escuchando `locations/{driverId}`

## Pricing
- `precioBase = max(minimumFare, baseFare + km * perKm)`
- `precioFinal = redondear(precioBase * timeMultiplier * weatherMultiplier)`
- Si varias reglas horarias aplican, se usa la de mayor multiplicador.

## Ejecutar
```bash
npm install
npm run dev
```

## Tests
```bash
npm run test
```

## Deploy en Vercel
1. Importar repo
2. Cargar variables de entorno
3. Deploy

## Seed admin (opcional)
```bash
node scripts/seed-admin.mjs
```

## Nota PWA Android
En Chrome Android: menu -> `Agregar a pantalla principal`.
