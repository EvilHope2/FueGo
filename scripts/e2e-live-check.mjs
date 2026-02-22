import { readFileSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";
import { setTimeout as wait } from "timers/promises";
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

loadEnv(resolve(process.cwd(), ".env.local"));

const required = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "FIREBASE_ADMIN_DATABASE_URL",
];
for (const k of required) {
  if (!process.env[k]) throw new Error(`Missing env var: ${k}`);
}

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
let devProcess;

async function ensureReady(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 307 || r.status === 308) return;
    } catch {}
    await wait(2000);
  }
  throw new Error("Dev server did not become ready in time");
}

async function getIdToken(email, pass) {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
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
  const resp = await fetch(`http://127.0.0.1:3010${path}`, {
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
  if (devProcess && !devProcess.killed) {
    devProcess.kill("SIGTERM");
  }

  if (rideId) {
    await adminDb.doc(`rides/${rideId}`).delete().catch(() => {});
    await adminRtdb.ref(`rideStatus/${rideId}`).remove().catch(() => {});
    if (driverUid) {
      await adminRtdb.ref(`rideOffers/${driverUid}/${rideId}`).remove().catch(() => {});
    }
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
}

try {
  const clientUser = await adminAuth.createUser({ email: clientEmail, password });
  const driverUser = await adminAuth.createUser({ email: driverEmail, password });
  clientUid = clientUser.uid;
  driverUid = driverUser.uid;

  await adminDb.doc(`users/${clientUid}`).set({ role: "client", name: "E2E Client", createdAt: Date.now() }, { merge: true });
  await adminDb.doc(`users/${driverUid}`).set({ role: "driver", name: "E2E Driver", createdAt: Date.now() }, { merge: true });
  await adminDb.doc(`drivers/${driverUid}`).set({ status: "approved", vehicleType: "auto", isOnline: true, createdAt: Date.now() }, { merge: true });

  const lat = -53.7878;
  const lng = -67.7095;

  await adminRtdb.ref(`presence/${driverUid}`).set({ online: true, lastSeenAt: Date.now() });
  await adminRtdb.ref(`locations/${driverUid}`).set({ lat, lng, geohash: geohashForLocation([lat, lng]), updatedAt: Date.now() });

  devProcess = spawn("npm", ["run", "dev", "--", "--port", "3010"], {
    cwd: process.cwd(),
    env: process.env,
    shell: true,
    stdio: "pipe",
  });

  devProcess.stdout.on("data", () => {});
  devProcess.stderr.on("data", () => {});

  await ensureReady("http://127.0.0.1:3010/login");

  const clientToken = await getIdToken(clientEmail, password);
  const driverToken = await getIdToken(driverEmail, password);

  const pickup = { address: "San Martin 1000, Rio Grande", lat: -53.7878, lng: -67.7095 };
  const dropoff = { address: "Belgrano 900, Rio Grande", lat: -53.8005, lng: -67.7142 };

  const create = await callApi("/api/rides/create", clientToken, {
    pickup,
    dropoff,
    distanceKm: 3.2,
    durationMin: 11,
  });

  rideId = create.rideId;
  if (!rideId) throw new Error("rideId not returned");

  const match = await callApi("/api/match", clientToken, { rideId, radiusKm: 5 });
  if (!match.offered || match.offered < 1) throw new Error("No offers created in match");

  const offerSnap = await adminRtdb.ref(`rideOffers/${driverUid}/${rideId}`).get();
  if (!offerSnap.exists() || offerSnap.val()?.status !== "sent") {
    throw new Error("Expected sent offer in RTDB");
  }

  await callApi("/api/driver/accept", driverToken, { rideId });

  const rideSnapAfterAccept = await adminDb.doc(`rides/${rideId}`).get();
  if (!rideSnapAfterAccept.exists || rideSnapAfterAccept.data()?.driverId !== driverUid || rideSnapAfterAccept.data()?.status !== "accepted") {
    throw new Error("Ride not accepted in Firestore");
  }

  const statusSnapAfterAccept = await adminRtdb.ref(`rideStatus/${rideId}`).get();
  if (!statusSnapAfterAccept.exists() || statusSnapAfterAccept.val()?.status !== "accepted") {
    throw new Error("Ride status not accepted in RTDB");
  }

  await callApi("/api/driver/status", driverToken, { rideId, status: "arriving" });
  await callApi("/api/driver/status", driverToken, { rideId, status: "in_progress" });
  await callApi("/api/driver/status", driverToken, { rideId, status: "completed" });

  const finalRide = await adminDb.doc(`rides/${rideId}`).get();
  const finalStatus = await adminRtdb.ref(`rideStatus/${rideId}`).get();

  if (finalRide.data()?.status !== "completed") throw new Error("Final Firestore status is not completed");
  if (finalStatus.val()?.status !== "completed") throw new Error("Final RTDB status is not completed");

  console.log("E2E_OK", { rideId, clientUid, driverUid });
} catch (error) {
  console.error("E2E_FAILED", error);
  process.exitCode = 1;
} finally {
  await cleanup();
}
