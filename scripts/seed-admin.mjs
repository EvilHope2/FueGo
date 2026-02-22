/* eslint-disable no-console */
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
const adminUid = process.env.FUEGO_ADMIN_UID;

if (!projectId || !clientEmail || !privateKey || !adminUid) {
  throw new Error("Missing env vars: FIREBASE_ADMIN_*, FUEGO_ADMIN_UID");
}

initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

async function run() {
  const db = getFirestore();
  await db.doc(`users/${adminUid}`).set(
    {
      role: "admin",
      name: "Admin FueGo",
      createdAt: Date.now(),
    },
    { merge: true },
  );

  await db.doc("settings/pricing").set(
    {
      baseFare: 900,
      perKm: 950,
      minimumFare: 2500,
      rounding: 50,
      timeRules: [
        {
          name: "Nocturno",
          start: "22:00",
          end: "06:00",
          multiplier: 1.15,
          enabled: true,
        },
      ],
      weatherRules: {
        enabled: false,
        mode: "manual",
        multiplier: 1.2,
        label: "Viento/Nieve",
      },
    },
    { merge: true },
  );

  console.log("Admin seeded:", adminUid);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
