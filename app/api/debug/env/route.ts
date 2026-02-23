import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { role } = await requireApiUser(req);
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      hasDbUrl: !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      hasMapboxToken: !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unexpected error" }, { status: 500 });
  }
}
