"use client";

import { auth } from "@/lib/firebaseClient";

export async function callAuthedApi<T = any>(url: string, body: object) {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}
