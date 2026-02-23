import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function app() {
  const projectId = required("FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = required("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = required("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n");
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.firebaseio.com`;

  return (
    getApps()[0] ||
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL,
    })
  );
}

export const adminDb = () => getFirestore(app());
export const adminRtdb = () => getDatabase(app());
export const adminAuth = () => getAuth(app());

export async function requireApiUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    throw new Error("Missing auth token");
  }
  const decoded = await adminAuth().verifyIdToken(token);
  const userSnap = await adminDb().doc(`users/${decoded.uid}`).get();
  if (!userSnap.exists) throw new Error("User profile not found");
  const role = userSnap.data()?.role as "client" | "driver" | "admin";
  return { uid: decoded.uid, role };
}

