import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getRequiredPublicEnv } from "@/lib/env";

const firebaseConfig = {
  apiKey: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  databaseURL: getRequiredPublicEnv("NEXT_PUBLIC_FIREBASE_DATABASE_URL"),
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
