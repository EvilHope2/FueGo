import { NextRequest, NextResponse } from "next/server";
import { distanceBetween, geohashQueryBounds } from "geofire-common";
import { getAdminDb, getAdminRtdb } from "@/lib/firebaseAdmin";
import { verifyRequestUser } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = await verifyRequestUser(req);
    const body = await req.json();
    const rideId = body?.rideId as string | undefined;
    const radiusKm = Number(body?.radiusKm || 2);

    if (!rideId) {
      return NextResponse.json({ error: "rideId is required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const rtdb = getAdminRtdb();

    const rideRef = adminDb.doc(`rides/${rideId}`);
    const rideSnap = await rideRef.get();
    if (!rideSnap.exists) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    const ride = rideSnap.data() as any;
    if (role !== "admin" && ride.clientId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (["completed", "canceled"].includes(ride.status)) {
      return NextResponse.json({ offered: 0, status: ride.status });
    }

    const center = [ride.pickup.lat, ride.pickup.lng] as [number, number];
    const bounds = geohashQueryBounds(center, radiusKm * 1000);

    const presenceSnap = await rtdb.ref("presence").orderByChild("online").equalTo(true).get();
    const onlineIds = new Set<string>(presenceSnap.exists() ? Object.keys(presenceSnap.val()) : []);
    const approvedDriversSnap = await adminDb.collection("drivers").where("status", "==", "approved").get();
    const approvedIds = new Set<string>(approvedDriversSnap.docs.map((d) => d.id));

    const candidates = new Map<string, { distanceKm: number; location: { lat: number; lng: number } }>();

    for (const [start, end] of bounds) {
      const locationsSnap = await rtdb.ref("locations").orderByChild("geohash").startAt(start).endAt(end).limitToFirst(200).get();
      const locations = (locationsSnap.exists() ? locationsSnap.val() : {}) as Record<string, any>;

      for (const [driverId, location] of Object.entries(locations)) {
        if (!onlineIds.has(driverId) || !approvedIds.has(driverId)) {
          continue;
        }
        if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lng)) {
          continue;
        }

        const distanceKm = distanceBetween([location.lat, location.lng], center);
        if (distanceKm <= radiusKm) {
          const prev = candidates.get(driverId);
          if (!prev || prev.distanceKm > distanceKm) {
            candidates.set(driverId, {
              distanceKm,
              location: { lat: location.lat, lng: location.lng },
            });
          }
        }
      }
    }

    const selected = Array.from(candidates.entries())
      .sort((a, b) => a[1].distanceKm - b[1].distanceKm)
      .slice(0, 5);

    const now = Date.now();
    const offersBatch = adminDb.batch();
    const updates: Record<string, any> = {
      [`rideStatus/${rideId}`]: {
        status: selected.length ? "offered" : "requested",
        driverId: null,
        clientId: ride.clientId,
        updatedAt: now,
      },
    };

    for (const [driverId] of selected) {
      updates[`rideOffers/${driverId}/${rideId}`] = {
        status: "sent",
        pickup: ride.pickup,
        dropoff: ride.dropoff,
        estimate: ride.estimate,
        sentAt: now,
      };

      offersBatch.set(
        adminDb.doc(`rides/${rideId}/offers/${driverId}`),
        {
          status: "sent",
          sentAt: now,
          respondedAt: null,
          driverId,
        },
        { merge: true },
      );
    }

    await rtdb.ref().update(updates);
    await offersBatch.commit();

    await rideRef.update({
      status: selected.length ? "offered" : "requested",
      updatedAt: now,
    });

    return NextResponse.json({ offered: selected.length, radiusKm });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}
