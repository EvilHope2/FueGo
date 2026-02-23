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

type PublicEnvSnapshot = Record<PublicEnvName, string | undefined>;

function getPublicEnvSnapshot(): PublicEnvSnapshot {
  // Accessors must be static so Next.js can inline NEXT_PUBLIC_* at build time.
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

function buildFirebaseClientState() {
  const env = getPublicEnvSnapshot();
  const missingRequiredEnv = ([
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
  ] as const).filter((name) => !env[name]);

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

  return {
    status: {
      ok: !missingMessage,
      missingRequiredEnv,
      message: missingMessage,
    },
    config: {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
      databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    },
  };
}

const firebaseClientState = buildFirebaseClientState();
export const firebaseClientStatus = firebaseClientState.status;
export function getFirebasePublicConfig() {
  return firebaseClientState.config;
}

const appInstance: FirebaseApp | null = firebaseClientStatus.ok
  ? getApps().length
    ? getApp()
    : initializeApp(getFirebasePublicConfig())
  : null;

export const firebaseApp = appInstance;
export const firebaseAuth = (appInstance ? getAuth(appInstance) : (null as unknown as Auth)) as Auth;
export const firestore = (appInstance ? getFirestore(appInstance) : (null as unknown as Firestore)) as Firestore;
export const rtdb = (appInstance ? getDatabase(appInstance) : (null as unknown as Database)) as Database;

