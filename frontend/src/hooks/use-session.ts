"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { SessionUser } from "@/lib/auth";

export function useSession() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<SessionUser>("/api/auth/me"),
    retry: false,
    meta: { skipAuthRedirect: true },
  });
}
