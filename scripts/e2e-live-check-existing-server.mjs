import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { geohashForLocation } from "geofire-common";

function loadEnv(path) {
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const k = line.slice(0, idx);
    const v = line.slice(idx + 1);
    if (!process.env[k]) process.env[k] = v;
  }
}

async function fetchWithTimeout(url, options = {}, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

loadEnv(resolve(process.cwd(), ".env.local"));

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_ADMIN_DATABASE_URL,
});

const adminAuth = getAuth(app);
const adminDb = getFirestore(app);
const adminRtdb = getDatabase(app);

const runId = Date.now();
const clientEmail = `e2e.client.${runId}@fuego.test`;
const driverEmail = `e2e.driver.${runId}@fuego.test`;
const password = "FueGoTest#123";

let clientUid = "";
let driverUid = "";
let rideId = "";

async function getIdToken(email, pass) {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const resp = await fetchWithTimeout(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass, returnSecureToken: true }),
  });
  const json = await resp.json();
  if (!resp.ok || !json.idToken) {
    throw new Error(`Failed signIn for ${email}: ${JSON.stringify(json)}`);
  }
  return json.idToken;
}

async function callApi(path, token, body) {
  const resp = await fetchWithTimeout(`http://127.0.0.1:3010${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`${path} failed: ${resp.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function cleanup() {
  console.log("cleanup:start");
  if (rideId) {
    await adminDb.doc(`rides/${rideId}`).delete().catch(() => {});
    await adminRtdb.ref(`rideStatus/${rideId}`).remove().catch(() => {});
    if (driverUid) await adminRtdb.ref(`rideOffers/${driverUid}/${rideId}`).remove().catch(() => {});
  }
  if (driverUid) {
    await adminDb.doc(`drivers/${driverUid}`).delete().catch(() => {});
    await adminDb.doc(`users/${driverUid}`).delete().catch(() => {});
    await adminRtdb.ref(`presence/${driverUid}`).remove().catch(() => {});
    await adminRtdb.ref(`locations/${driverUid}`).remove().catch(() => {});
    await adminAuth.deleteUser(driverUid).catch(() => {});
  }
  if (clientUid) {
    await adminDb.doc(`users/${clientUid}`).delete().catch(() => {});
    await adminAuth.deleteUser(clientUid).catch(() => {});
  }
  console.log("cleanup:done");
}

try {
  console.log("step:ping");
  const ping = await fetchWithTimeout("http://127.0.0.1:3010/login");
  if (!ping.ok && ping.status !== 307 && ping.status !== 308) throw new Error("Local server 3010 not reachable");

  console.log("step:create-users");
  const clientUser = await adminAuth.createUser({ email: clientEmail, password });
  const driverUser = await adminAuth.createUser({ email: driverEmail, password });
  clientUid = clientUser.uid;
  driverUid = driverUser.uid;

  console.log("step:seed-firestore");
  await adminDb.doc(`users/${clientUid}`).set({ role: "client", name: "E2E Client", createdAt: Date.now() }, { merge: true });
  await adminDb.doc(`users/${driverUid}`).set({ role: "driver", name: "E2E Driver", createdAt: Date.now() }, { merge: true });
  await adminDb.doc(`drivers/${driverUid}`).set({ status: "approved", vehicleType: "auto", isOnline: true, createdAt: Date.now() }, { merge: true });

  console.log("step:seed-rtdb");
  const lat = -53.7878;
  const lng = -67.7095;
  await adminRtdb.ref(`presence/${driverUid}`).set({ online: true, lastSeenAt: Date.now() });
  await adminRtdb.ref(`locations/${driverUid}`).set({ lat, lng, geohash: geohashForLocation([lat, lng]), updatedAt: Date.now() });

  console.log("step:tokens");
  const clientToken = await getIdToken(clientEmail, password);
  const driverToken = await getIdToken(driverEmail, password);

  console.log("step:create-ride");
  const pickup = { address: "San Martin 1000, Rio Grande", lat: -53.7878, lng: -67.7095 };
  const dropoff = { address: "Belgrano 900, Rio Grande", lat: -53.8005, lng: -67.7142 };
  const create = await callApi("/api/rides/create", clientToken, { pickup, dropoff, distanceKm: 3.2, durationMin: 11 });
  rideId = create.rideId;

  console.log("step:match", rideId);
  const match = await callApi("/api/match", clientToken, { rideId, radiusKm: 5 });
  if (!match.offered || match.offered < 1) throw new Error("No offers from /api/match");

  console.log("step:verify-offer");
  const offerSnap = await adminRtdb.ref(`rideOffers/${driverUid}/${rideId}`).get();
  if (!offerSnap.exists() || offerSnap.val()?.status !== "sent") throw new Error("Offer not found in RTDB");

  console.log("step:accept");
  await callApi("/api/driver/accept", driverToken, { rideId });

  console.log("step:status-arriving");
  await callApi("/api/driver/status", driverToken, { rideId, status: "arriving" });
  console.log("step:status-in-progress");
  await callApi("/api/driver/status", driverToken, { rideId, status: "in_progress" });
  console.log("step:status-completed");
  await callApi("/api/driver/status", driverToken, { rideId, status: "completed" });

  console.log("step:verify-final");
  const finalRide = await adminDb.doc(`rides/${rideId}`).get();
  const finalStatus = await adminRtdb.ref(`rideStatus/${rideId}`).get();

  if (finalRide.data()?.status !== "completed") throw new Error("Final Firestore status != completed");
  if (finalStatus.val()?.status !== "completed") throw new Error("Final RTDB status != completed");

  console.log("E2E_OK", { rideId, clientUid, driverUid });
} catch (e) {
  console.error("E2E_ERR", e);
  process.exitCode = 1;
} finally {
  await cleanup();
}
