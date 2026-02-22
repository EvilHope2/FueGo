"use client";

import {
  DataSnapshot,
  off,
  onDisconnect,
  onValue,
  ref,
  set,
  update,
} from "firebase/database";
import { geohashForLocation } from "geofire-common";
import { app } from "@/lib/firebaseClient";
import { getDatabase } from "firebase/database";

export const rtdb = getDatabase(app);

export async function setDriverOnline(driverId: string) {
  const presenceRef = ref(rtdb, `presence/${driverId}`);
  await set(presenceRef, {
    online: true,
    lastSeenAt: Date.now(),
  });

  const disconnectOp = onDisconnect(presenceRef);
  await disconnectOp.update({
    online: false,
    lastSeenAt: Date.now(),
  });
}

export async function setDriverOffline(driverId: string) {
  const presenceRef = ref(rtdb, `presence/${driverId}`);
  await onDisconnect(presenceRef).cancel();
  await update(presenceRef, {
    online: false,
    lastSeenAt: Date.now(),
  });
}

export function startLocationTracking(driverId: string) {
  const locationRef = ref(rtdb, `locations/${driverId}`);
  const presenceRef = ref(rtdb, `presence/${driverId}`);

  const pushLocation = async (lat: number, lng: number) => {
    await set(locationRef, {
      lat,
      lng,
      geohash: geohashForLocation([lat, lng]),
      updatedAt: Date.now(),
    });

    await update(presenceRef, {
      online: true,
      lastSeenAt: Date.now(),
    });
  };

  let watchId: number | null = null;
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      async (position) => {
        await pushLocation(position.coords.latitude, position.coords.longitude);
      },
      async () => {
        await update(presenceRef, { lastSeenAt: Date.now() });
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
  }

  const heartbeat = setInterval(() => {
    update(presenceRef, { online: true, lastSeenAt: Date.now() });
  }, 20_000);

  return () => {
    clearInterval(heartbeat);
    if (watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}

export function listenRideStatus(rideId: string, cb: (value: any | null) => void) {
  const statusRef = ref(rtdb, `rideStatus/${rideId}`);
  const handler = (snapshot: DataSnapshot) => cb(snapshot.exists() ? snapshot.val() : null);
  onValue(statusRef, handler);
  return () => off(statusRef, "value", handler);
}

export function listenDriverOffers(driverId: string, cb: (offers: any[]) => void) {
  const offersRef = ref(rtdb, `rideOffers/${driverId}`);
  const handler = (snapshot: DataSnapshot) => {
    const value = (snapshot.exists() ? snapshot.val() : {}) as Record<string, any>;
    const list = Object.entries(value)
      .map(([rideId, offer]) => ({ rideId, ...offer }))
      .sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
    cb(list);
  };

  onValue(offersRef, handler);
  return () => off(offersRef, "value", handler);
}

export function listenDriverPresence(driverId: string, cb: (presence: any | null) => void) {
  const presenceRef = ref(rtdb, `presence/${driverId}`);
  const handler = (snapshot: DataSnapshot) => cb(snapshot.exists() ? snapshot.val() : null);
  onValue(presenceRef, handler);
  return () => off(presenceRef, "value", handler);
}

export function listenDriverLocation(driverId: string, cb: (location: any | null) => void) {
  const locationRef = ref(rtdb, `locations/${driverId}`);
  const handler = (snapshot: DataSnapshot) => cb(snapshot.exists() ? snapshot.val() : null);
  onValue(locationRef, handler);
  return () => off(locationRef, "value", handler);
}
