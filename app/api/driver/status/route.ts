import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireApiUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const transitions: Record<string, string[]> = {
  accepted: ["arriving"],
  arriving: ["in_progress"],
  in_progress: ["completed"],
};

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = await requireApiUser(req);
    if (role !== "driver" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const rideId = body?.rideId as string;
    const nextStatus = body?.status as string;
    if (!rideId || !nextStatus) return NextResponse.json({ error: "rideId y status requeridos" }, { status: 400 });

    const rideRef = adminDb().doc(`rides/${rideId}`);
    const snap = await rideRef.get();
    if (!snap.exists) return NextResponse.json({ error: "Ride no encontrado" }, { status: 404 });

    const ride = snap.data() as any;
    if (role === "driver" && ride.driverId !== uid) {
      return NextResponse.json({ error: "No asignado" }, { status: 403 });
    }

    const allowed = transitions[ride.status] || [];
    if (role !== "admin" && !allowed.includes(nextStatus)) {
      return NextResponse.json({ error: "Transicion invalida" }, { status: 400 });
    }

    await rideRef.update({
      status: nextStatus,
      updatedAt: Date.now(),
      ...(nextStatus === "completed" ? { final: ride.final || ride.estimate } : {}),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}

