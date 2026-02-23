import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyRequestUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { role } = await verifyRequestUser(req);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const driverId = body?.driverId as string;
    const status = body?.status as "pending" | "approved" | "blocked";

    if (!driverId || !status) {
      return NextResponse.json({ error: "driverId and status are required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    await adminDb.doc(`drivers/${driverId}`).set(
      {
        status,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}

