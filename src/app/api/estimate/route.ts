import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { computePrice, getNowInTimeZone, normalizePricingDoc, RIO_GRANDE_TZ } from "@/lib/pricing";
import { verifyRequestUser } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  try {
    await verifyRequestUser(req);
    const body = await req.json();

    const distanceKm = Number(body?.distanceKm || 0);
    const durationMin = Number(body?.durationMin || 0);

    if (distanceKm <= 0 || durationMin <= 0) {
      return NextResponse.json({ error: "distanceKm y durationMin son requeridos" }, { status: 400 });
    }

    const pricingSnap = await getAdminDb().doc("settings/pricing").get();
    const pricing = normalizePricingDoc(pricingSnap.exists ? (pricingSnap.data() as any) : null);
    if (!pricingSnap.exists) {
      await getAdminDb().doc("settings/pricing").set(pricing, { merge: true });
    }

    const nowLocal = getNowInTimeZone(RIO_GRANDE_TZ);
    const computed = computePrice(distanceKm, pricing, nowLocal);
    const sanitizedBreakdown = {
      ...computed.breakdown,
      timeRuleName: computed.breakdown.timeRuleName || null,
      weatherLabel: computed.breakdown.weatherLabel || null,
    };

    return NextResponse.json({
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
      badges: {
        time: computed.breakdown.timeMultiplier > 1 ? computed.breakdown.timeRuleName || "Horario" : null,
        weather: computed.breakdown.weatherMultiplier > 1 ? computed.breakdown.weatherLabel || "Clima" : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}
