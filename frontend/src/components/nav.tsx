"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/fuel-expenses", label: "Fuel & Expenses" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<SessionUser>("/api/auth/me"),
    retry: false,
    meta: { skipAuthRedirect: true },
  });

  const isAuthed = !!sessionQuery.data;

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      queryClient.clear();
      toast.success("Logged out");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Logout failed");
    }
  };

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href={isAuthed ? "/dashboard" : "/"} className="text-sm font-semibold">
            TransitOps
          </Link>
          {isAuthed && (
            <nav className="flex items-center gap-4">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm text-muted-foreground transition-colors hover:text-foreground",
                    pathname === link.href && "text-foreground font-medium"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {sessionQuery.isLoading ? (
            <Skeleton className="h-7 w-16" />
          ) : isAuthed ? (
            <>
              <span className="text-sm text-muted-foreground">{sessionQuery.data?.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log Out
              </Button>
            </>
          ) : (
            pathname !== "/login" && (
              <Button size="sm" asChild>
                <Link href="/login">Log In</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
