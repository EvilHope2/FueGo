"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Role } from "@/types";
import { useAuth } from "@/providers/AuthProvider";

export function useRoleGuard(allowedRoles: Role[]) {
  const { loading, profile, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user || !profile) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!allowedRoles.includes(profile.role)) {
      const rolePath = profile.role === "client" ? "/cliente/home" : profile.role === "driver" ? "/chofer/home" : "/admin/choferes";
      router.replace(rolePath);
    }
  }, [allowedRoles, loading, pathname, profile, router, user]);

  return {
    loading,
    isAuthorized: !!profile && allowedRoles.includes(profile.role),
  };
}

