"use client";

import { firebaseAuth, firebaseClientStatus } from "@/lib/firebaseClient";

export async function getIdTokenOrThrow() {
  if (!firebaseClientStatus.ok) {
    throw new Error(firebaseClientStatus.message || "Firebase no configurado");
  }
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Debes iniciar sesion");
  return user.getIdToken();
}

export async function authedFetch<T = any>(path: string, body?: unknown): Promise<T> {
  const token = await getIdTokenOrThrow();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "Request failed");
  }
  return json as T;
}

