"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Role } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";

export function useRoleGuard(allowed: Role[]) {
  const { loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!role || !allowed.includes(role))) {
      router.replace("/login");
    }
  }, [allowed, loading, role, router]);

  return { loading, allowed: !!role && allowed.includes(role) };
}

