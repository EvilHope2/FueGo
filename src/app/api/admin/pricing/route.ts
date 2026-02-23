import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { normalizePricingDoc, validatePricing } from "@/lib/pricing";
import { verifyRequestUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { role } = await verifyRequestUser(req);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const payload = normalizePricingDoc(body);
    const validationError = validatePricing(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const adminDb = getAdminDb();
    await adminDb.doc("settings/pricing").set(payload, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}

