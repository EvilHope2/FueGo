import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireApiUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = await requireApiUser(req);
    if (role !== "driver") {
      return NextResponse.json({ error: "Solo choferes" }, { status: 403 });
    }

    const body = await req.json();
    const rideId = body?.rideId as string;
    if (!rideId) return NextResponse.json({ error: "rideId requerido" }, { status: 400 });

    const rideRef = adminDb().doc(`rides/${rideId}`);

    const tx = await adminDb().runTransaction(async (trx) => {
      const rideSnap = await trx.get(rideRef);
      if (!rideSnap.exists) throw new Error("Ride no encontrado");
      const ride = rideSnap.data() as any;

      if (ride.driverId && ride.driverId !== uid) return { accepted: false };
      if (!["requested", "offered"].includes(ride.status)) return { accepted: false };

      trx.update(rideRef, { driverId: uid, status: "accepted", updatedAt: Date.now() });
      return { accepted: true };
    });

    if (!tx.accepted) {
      return NextResponse.json({ error: "taken" }, { status: 409 });
    }

    const offersRef = adminDb().collection(`rides/${rideId}/offers`);
    const offersSnap = await offersRef.get();
    const batch = adminDb().batch();

    offersSnap.docs.forEach((offerDoc) => {
      batch.set(
        offerDoc.ref,
        {
          status: offerDoc.id === uid ? "accepted" : "expired",
          respondedAt: Date.now(),
        },
        { merge: true },
      );
    });

    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}

