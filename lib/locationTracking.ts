"use client";

import { ref, set } from "firebase/database";
import { rtdb } from "@/lib/firebaseClient";

export function startDriverLocationTracking(uid: string) {
  if (!navigator.geolocation) return () => {};

  let lastUpdate = 0;
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const now = Date.now();
      if (now - lastUpdate < 7000) return;
      lastUpdate = now;
      set(ref(rtdb, `locations/${uid}`), {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        updatedAt: now,
      });
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}

