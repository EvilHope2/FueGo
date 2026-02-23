import { onValue, ref, set } from "firebase/database";
import { rtdb } from "@/lib/firebaseClient";

export function setRtdbPresence(uid: string, online: boolean) {
  return set(ref(rtdb, `presence/${uid}`), {
    online,
    lastSeenAt: Date.now(),
  });
}

export function updateRtdbLocation(uid: string, lat: number, lng: number) {
  return set(ref(rtdb, `locations/${uid}`), {
    lat,
    lng,
    updatedAt: Date.now(),
  });
}

export function listenDriverLocation(driverId: string, cb: (loc: { lat: number; lng: number } | null) => void) {
  return onValue(ref(rtdb, `locations/${driverId}`), (snap) => {
    cb(snap.exists() ? (snap.val() as { lat: number; lng: number }) : null);
  });
}

