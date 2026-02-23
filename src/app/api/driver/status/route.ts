import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminRtdb } from "@/lib/firebaseAdmin";
import { verifyRequestUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

const transitions: Record<string, string[]> = {
  accepted: ["arriving", "canceled"],
  arriving: ["in_progress", "canceled"],
  in_progress: ["completed", "canceled"],
};

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = await verifyRequestUser(req);
    const body = await req.json();
    const rideId = body?.rideId as string;
    const nextStatus = body?.status as string;

    if (!rideId || !nextStatus) {
      return NextResponse.json({ error: "rideId and status are required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const rtdb = getAdminRtdb();

    const rideRef = adminDb.doc(`rides/${rideId}`);
    const rideSnap = await rideRef.get();
    if (!rideSnap.exists) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }

    const ride = rideSnap.data() as any;
    const isAssignedDriver = role === "driver" && ride.driverId === uid;
    const isAdmin = role === "admin";

    if (!isAssignedDriver && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowed = transitions[ride.status] || [];
    if (!allowed.includes(nextStatus) && !isAdmin) {
      return NextResponse.json({ error: `Invalid transition from ${ride.status} to ${nextStatus}` }, { status: 400 });
    }

    const now = Date.now();
    const payload: any = {
      status: nextStatus,
      updatedAt: now,
    };

    if (nextStatus === "completed") {
      payload.final = ride.final || ride.estimate;
    }

    await rideRef.update(payload);
    await rtdb.ref(`rideStatus/${rideId}`).set({
      status: nextStatus,
      driverId: ride.driverId || null,
      clientId: ride.clientId,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}
