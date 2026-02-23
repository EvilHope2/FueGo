import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminRtdb, requireApiUser } from "@/lib/firebaseAdmin";
import { haversineKm } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = await requireApiUser(req);
    const body = await req.json();
    const rideId = body?.rideId as string;
    if (!rideId) return NextResponse.json({ error: "rideId requerido" }, { status: 400 });

    const rideRef = adminDb().doc(`rides/${rideId}`);
    const rideSnap = await rideRef.get();
    if (!rideSnap.exists) return NextResponse.json({ error: "Ride no encontrado" }, { status: 404 });

    const ride = rideSnap.data() as any;
    if (role !== "admin" && ride.clientId !== uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const driversSnap = await adminDb().collection("drivers").where("status", "==", "approved").get();
    const approvedIds = new Set(driversSnap.docs.map((d) => d.id));

    const [presenceSnap, locationsSnap] = await Promise.all([
      adminRtdb().ref("presence").get(),
      adminRtdb().ref("locations").get(),
    ]);

    const presence = (presenceSnap.exists() ? presenceSnap.val() : {}) as Record<string, any>;
    const locations = (locationsSnap.exists() ? locationsSnap.val() : {}) as Record<string, any>;

    const candidates = Object.entries(locations)
      .filter(([driverId, loc]) => approvedIds.has(driverId) && presence[driverId]?.online && Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng))
      .map(([driverId, loc]) => ({
        driverId,
        distanceKm: haversineKm({ lat: ride.pickup.lat, lng: ride.pickup.lng }, { lat: loc.lat, lng: loc.lng }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);

    const batch = adminDb().batch();
    const now = Date.now();

    for (const candidate of candidates) {
      batch.set(
        adminDb().doc(`rides/${rideId}/offers/${candidate.driverId}`),
        { status: "sent", sentAt: now, respondedAt: null, driverId: candidate.driverId },
        { merge: true },
      );
    }

    batch.update(rideRef, { status: candidates.length ? "offered" : "requested", updatedAt: now });
    await batch.commit();

    return NextResponse.json({ offered: candidates.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}

