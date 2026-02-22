import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminRtdb } from "@/lib/firebaseAdmin";
import { verifyRequestUser } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = await verifyRequestUser(req);
    if (role !== "driver") {
      return NextResponse.json({ error: "Only drivers can accept rides" }, { status: 403 });
    }

    const body = await req.json();
    const rideId = body?.rideId as string | undefined;

    if (!rideId) {
      return NextResponse.json({ error: "rideId is required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const rtdb = getAdminRtdb();

    const offerSnap = await rtdb.ref(`rideOffers/${uid}/${rideId}`).get();
    if (!offerSnap.exists() || offerSnap.val()?.status !== "sent") {
      return NextResponse.json({ error: "Offer not available" }, { status: 400 });
    }

    const rideRef = adminDb.doc(`rides/${rideId}`);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const rideSnap = await tx.get(rideRef);
      if (!rideSnap.exists) {
        throw new Error("Ride not found");
      }

      const ride = rideSnap.data() as any;
      if (ride.driverId && ride.driverId !== uid) {
        return { accepted: false, clientId: ride.clientId };
      }

      if (!["requested", "offered"].includes(ride.status)) {
        return { accepted: false, clientId: ride.clientId };
      }

      tx.update(rideRef, {
        driverId: uid,
        status: "accepted",
        updatedAt: Date.now(),
      });

      return { accepted: true, clientId: ride.clientId };
    });

    if (!txResult.accepted) {
      return NextResponse.json({ error: "Ride already taken" }, { status: 409 });
    }

    const now = Date.now();
    const updates: Record<string, any> = {
      [`rideOffers/${uid}/${rideId}/status`]: "accepted",
      [`rideOffers/${uid}/${rideId}/respondedAt`]: now,
      [`rideStatus/${rideId}`]: {
        status: "accepted",
        driverId: uid,
        clientId: txResult.clientId,
        updatedAt: now,
      },
    };

    const allOffersSnap = await rtdb.ref("rideOffers").get();
    const allOffers = (allOffersSnap.exists() ? allOffersSnap.val() : {}) as Record<string, any>;
    const offerBatch = adminDb.batch();
    offerBatch.set(
      adminDb.doc(`rides/${rideId}/offers/${uid}`),
      {
        status: "accepted",
        respondedAt: now,
      },
      { merge: true },
    );

    for (const [driverId, offersByRide] of Object.entries(allOffers)) {
      if (driverId === uid) continue;
      if (offersByRide?.[rideId]?.status === "sent") {
        updates[`rideOffers/${driverId}/${rideId}/status`] = "expired";
        updates[`rideOffers/${driverId}/${rideId}/respondedAt`] = now;
        offerBatch.set(
          adminDb.doc(`rides/${rideId}/offers/${driverId}`),
          {
            status: "expired",
            respondedAt: now,
          },
          { merge: true },
        );
      }
    }

    await rtdb.ref().update(updates);
    await offerBatch.commit();

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}
