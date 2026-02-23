"use client";

import { onDisconnect, ref, set } from "firebase/database";
import { rtdb } from "@/lib/firebaseClient";

export async function setDriverOnline(uid: string) {
  const driverPresenceRef = ref(rtdb, `presence/${uid}`);
  await set(driverPresenceRef, { online: true, lastSeenAt: Date.now() });

  const disconnect = onDisconnect(driverPresenceRef);
  await disconnect.set({ online: false, lastSeenAt: Date.now() });
}

export async function setDriverOffline(uid: string) {
  await set(ref(rtdb, `presence/${uid}`), { online: false, lastSeenAt: Date.now() });
}

export function heartbeatPresence(uid: string) {
  return window.setInterval(() => {
    set(ref(rtdb, `presence/${uid}/lastSeenAt`), Date.now());
  }, 20000);
}

