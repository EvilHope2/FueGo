"use client";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Ride } from "@/types";
import { normalizePricingDoc } from "@/lib/pricing";

export async function getPricing() {
  const snap = await getDoc(doc(db, "settings", "pricing"));
  return normalizePricingDoc(snap.exists() ? (snap.data() as any) : null);
}

export function watchRide(rideId: string, cb: (ride: Ride | null) => void) {
  return onSnapshot(doc(db, "rides", rideId), (snap) => {
    cb(snap.exists() ? (snap.data() as Ride) : null);
  });
}

export function watchClientRideHistory(clientId: string, cb: (rides: Array<Ride & { id: string }>) => void) {
  return onSnapshot(
    query(collection(db, "rides"), where("clientId", "==", clientId), orderBy("createdAt", "desc")),
    (snapshot) => {
      cb(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Ride) })));
    },
  );
}

