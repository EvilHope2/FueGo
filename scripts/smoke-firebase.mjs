import { readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

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

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const databaseURL = process.env.FIREBASE_ADMIN_DATABASE_URL;

if (!projectId || !clientEmail || !privateKey || !databaseURL) {
  throw new Error("Missing Admin env vars for smoke test");
}

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  databaseURL,
});

const db = getFirestore(app);
const rtdb = getDatabase(app);
const now = Date.now();
const testId = `smoke_${now}`;

const fsRef = db.doc(`healthchecks/${testId}`);
await fsRef.set({ ok: true, ts: now, source: "codex-smoke" });
const fsSnap = await fsRef.get();
if (!fsSnap.exists || fsSnap.data()?.ok !== true) {
  throw new Error("Firestore smoke write/read failed");
}

const rtRef = rtdb.ref(`healthchecks/${testId}`);
await rtRef.set({ ok: true, ts: now, source: "codex-smoke" });
const rtSnap = await rtRef.get();
if (!rtSnap.exists() || rtSnap.val()?.ok !== true) {
  throw new Error("RTDB smoke write/read failed");
}

await Promise.all([fsRef.delete(), rtRef.remove()]);

console.log("SMOKE_OK", { projectId, databaseURL, testId });
