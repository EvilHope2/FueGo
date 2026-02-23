import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { getRequiredServerEnv } from "@/lib/env";

function getAdminApp() {
  const projectId = getRequiredServerEnv("FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = getRequiredServerEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = getRequiredServerEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n");
  const databaseURL = process.env.FIREBASE_ADMIN_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`;

  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      databaseURL,
    })
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminRtdb() {
  return getDatabase(getAdminApp());
}
