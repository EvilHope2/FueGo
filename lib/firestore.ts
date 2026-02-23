import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebaseClient";
import { PricingDoc, RideStatus } from "@/lib/types";

export const rideStatuses: RideStatus[] = [
  "requested",
  "offered",
  "accepted",
  "arriving",
  "in_progress",
  "completed",
  "canceled",
];

export async function upsertUserProfile(uid: string, data: { role: string; name: string }) {
  await setDoc(doc(firestore, "users", uid), { ...data, createdAt: Date.now() }, { merge: true });
}

export async function createDriverProfile(uid: string) {
  await setDoc(
    doc(firestore, "drivers", uid),
    {
      status: "pending",
      vehicleType: "auto",
      plate: "",
      isOnline: false,
      createdAt: Date.now(),
    },
    { merge: true },
  );
}

export async function getPricingDoc(): Promise<PricingDoc> {
  const snap = await getDoc(doc(firestore, "settings", "pricing"));
  if (snap.exists()) return snap.data() as PricingDoc;

  const defaults: PricingDoc = {
    baseFare: 900,
    perKm: 950,
    minimumFare: 2500,
    rounding: 50,
    timeRules: [{ name: "Nocturno", start: "22:00", end: "06:00", multiplier: 1.15, enabled: true }],
    weatherRules: { enabled: false, mode: "manual", multiplier: 1.2, label: "Clima" },
  };
  await setDoc(doc(firestore, "settings", "pricing"), defaults, { merge: true });
  return defaults;
}

export function subscribeRide(rideId: string, cb: (ride: any | null) => void) {
  return onSnapshot(doc(firestore, "rides", rideId), (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null));
}

export function subscribeClientRides(clientId: string, cb: (rides: any[]) => void) {
  const q = query(collection(firestore, "rides"), where("clientId", "==", clientId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function subscribeDriverOffers(driverId: string, cb: (offers: any[]) => void) {
  const offersQ = query(collection(firestore, "rides"));
  return onSnapshot(offersQ, async (snap) => {
    const list: any[] = [];
    for (const rideDoc of snap.docs) {
      const offer = await getDoc(doc(firestore, "rides", rideDoc.id, "offers", driverId));
      if (offer.exists() && offer.data().status === "sent") {
        list.push({ rideId: rideDoc.id, ride: rideDoc.data(), offer: offer.data() });
      }
    }
    cb(list.sort((a, b) => (b.offer.sentAt || 0) - (a.offer.sentAt || 0)));
  });
}

export async function listPendingDrivers() {
  const q = query(collection(firestore, "drivers"), where("status", "==", "pending"));
  return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listRecentRides(limitCount = 100) {
  const q = query(collection(firestore, "rides"), orderBy("createdAt", "desc"));
  const docs = (await getDocs(q)).docs.slice(0, limitCount);
  return docs.map((d) => ({ id: d.id, ...d.data() }));
}

