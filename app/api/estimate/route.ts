import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireApiUser } from "@/lib/firebaseAdmin";
import { computePrice, normalizePricing } from "@/lib/pricing";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireApiUser(req);

    const body = await req.json();
    const distanceKm = Number(body?.distanceKm || 0);
    const durationMin = Number(body?.durationMin || 0);
    if (distanceKm <= 0 || durationMin <= 0) {
      return NextResponse.json({ error: "distanceKm y durationMin son requeridos" }, { status: 400 });
    }

    const pricingSnap = await adminDb().doc("settings/pricing").get();
    const pricing = normalizePricing((pricingSnap.exists ? pricingSnap.data() : null) as any);
    if (!pricingSnap.exists) {
      await adminDb().doc("settings/pricing").set(pricing, { merge: true });
    }

    const computed = computePrice(distanceKm, pricing, new Date());
    return NextResponse.json({
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin: Math.round(durationMin),
      price: computed.final,
      pricingBreakdown: computed.breakdown,
      appliedMultipliers: computed.appliedMultipliers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}

