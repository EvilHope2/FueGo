import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { Role } from "@/types";

export async function verifyRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    throw new Error("Missing auth token");
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const userDoc = await getAdminDb().doc(`users/${decoded.uid}`).get();

  if (!userDoc.exists) {
    throw new Error("User profile not found");
  }

  const role = (userDoc.data()?.role || "client") as Role;
  return { uid: decoded.uid, role };
}

export function anonymizePhone(phone: string) {
  return createHash("sha256").update(phone).digest("hex").slice(0, 12);
}
