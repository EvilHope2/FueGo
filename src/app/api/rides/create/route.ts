import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminRtdb } from "@/lib/firebaseAdmin";
import { computePrice, getNowInTimeZone, normalizePricingDoc, RIO_GRANDE_TZ } from "@/lib/pricing";
import { verifyRequestUser } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { uid, role } = await verifyRequestUser(req);
    if (role !== "client") {
      return NextResponse.json({ error: "Solo clientes pueden crear viajes" }, { status: 403 });
    }

    const body = await req.json();
    const pickup = body?.pickup;
    const dropoff = body?.dropoff;
    const distanceKm = Number(body?.distanceKm || 0);
    const durationMin = Number(body?.durationMin || 0);

    if (!pickup?.address || !dropoff?.address || distanceKm <= 0 || durationMin <= 0) {
      return NextResponse.json({ error: "Datos de viaje incompletos" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const adminRtdb = getAdminRtdb();
    const pricingSnap = await adminDb.doc("settings/pricing").get();
    const pricing = normalizePricingDoc(pricingSnap.exists ? (pricingSnap.data() as any) : null);
    if (!pricingSnap.exists) {
      await adminDb.doc("settings/pricing").set(pricing, { merge: true });
    }

    const nowLocal = getNowInTimeZone(RIO_GRANDE_TZ);
    const computed = computePrice(distanceKm, pricing, nowLocal);
    const sanitizedBreakdown = {
      ...computed.breakdown,
      timeRuleName: computed.breakdown.timeRuleName || null,
      weatherLabel: computed.breakdown.weatherLabel || null,
    };

    const rideRef = adminDb.collection("rides").doc();
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
        pricingBreakdown: sanitizedBreakdown,
        appliedMultipliers: {
          time: computed.breakdown.timeMultiplier,
          weather: computed.breakdown.weatherMultiplier,
          timeRuleName: computed.breakdown.timeRuleName || null,
          weatherLabel: computed.breakdown.weatherLabel || null,
        },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await adminRtdb.ref(`rideStatus/${rideRef.id}`).set({
      status: "requested",
      driverId: null,
      clientId: uid,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ rideId: rideRef.id, estimate: { ...computed } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}
