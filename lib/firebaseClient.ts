import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";
import { getFirestore, type Firestore } from "firebase/firestore";

type PublicEnvName =
  | "NEXT_PUBLIC_FIREBASE_API_KEY"
  | "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  | "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  | "NEXT_PUBLIC_FIREBASE_APP_ID"
  | "NEXT_PUBLIC_FIREBASE_DATABASE_URL"
  | "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  | "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  | "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID";

const missingRequiredEnv: string[] = [];

function requirePublicEnv(name: PublicEnvName, options?: { optional?: boolean }) {
  const value = process.env[name];
  if (!value && !options?.optional) {
    missingRequiredEnv.push(name);
  }
  return value;
}

const firebaseConfig = {
  apiKey: requirePublicEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: requirePublicEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: requirePublicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  appId: requirePublicEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  databaseURL: requirePublicEnv("NEXT_PUBLIC_FIREBASE_DATABASE_URL"),
  storageBucket: requirePublicEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", { optional: true }),
  messagingSenderId: requirePublicEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", { optional: true }),
  measurementId: requirePublicEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", { optional: true }),
};

const missingMessage =
  missingRequiredEnv.length > 0
    ? `Missing env var: ${missingRequiredEnv.join(", ")}`
    : null;

if (missingMessage) {
  if (process.env.NODE_ENV === "development") {
    throw new Error(missingMessage);
  }
  // eslint-disable-next-line no-console
  console.error(`[FueGo Config] ${missingMessage}`);
}

export const firebaseClientStatus = {
  ok: !missingMessage,
  missingRequiredEnv,
  message: missingMessage,
};

const appInstance: FirebaseApp | null = firebaseClientStatus.ok
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseApp = appInstance;
export const firebaseAuth = (appInstance ? getAuth(appInstance) : (null as unknown as Auth)) as Auth;
export const firestore = (appInstance ? getFirestore(appInstance) : (null as unknown as Firestore)) as Firestore;
export const rtdb = (appInstance ? getDatabase(appInstance) : (null as unknown as Database)) as Database;

