import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { computePrice, normalizePricing } from "@/lib/pricing";
import { requireApiUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = await requireApiUser(req);
    if (role !== "client") return NextResponse.json({ error: "Solo clientes" }, { status: 403 });

    const body = await req.json();
    const pickup = body?.pickup;
    const dropoff = body?.dropoff;
    const distanceKm = Number(body?.distanceKm || 0);
    const durationMin = Number(body?.durationMin || 0);

    if (!pickup?.address || !dropoff?.address || !pickup?.streetNumber || !dropoff?.streetNumber || distanceKm <= 0 || durationMin <= 0) {
      return NextResponse.json({ error: "Datos invalidos. Ingresa calle y altura para origen y destino." }, { status: 400 });
    }

    const pricingSnap = await adminDb().doc("settings/pricing").get();
    const pricing = normalizePricing((pricingSnap.exists ? pricingSnap.data() : null) as any);
    const computed = computePrice(distanceKm, pricing, new Date());

    const rideRef = adminDb().collection("rides").doc();
    const now = Date.now();
    await rideRef.set({
      clientId: uid,
      driverId: null,
      status: "requested",
      pickup,
      dropoff,
      estimate: {
        distanceKm: Number(distanceKm.toFixed(2)),
        durationMin: Math.round(durationMin),
        price: computed.final,
        pricingBreakdown: computed.breakdown,
        appliedMultipliers: computed.appliedMultipliers,
      },
      final: null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ rideId: rideRef.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}

