"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  MenuIcon,
  LayoutDashboard,
  BarChart3,
  Fuel,
  Settings as SettingsIcon,
  UserPlus,
  LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiClientError } from "@/lib/api";
import { can, NAV_ITEMS } from "@/lib/permissions";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/analytics": BarChart3,
  "/fuel-expenses": Fuel,
  "/settings": SettingsIcon,
  "/admin/users": UserPlus,
};

function NavLinks({ items, pathname, onNavigate }: { items: typeof NAV_ITEMS; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = NAV_ICONS[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === item.href
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const sessionQuery = useSession();
  const isAuthed = !!sessionQuery.data;
  const visibleItems = NAV_ITEMS.filter((item) => can(sessionQuery.data?.role, item.permission));

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

  // Public pages (landing, login) and the initial session check: simple top bar, no sidebar.
  if (sessionQuery.isLoading || !isAuthed) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <header className="border-b border-border">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="text-sm font-semibold">
              TransitOps
            </Link>
            {sessionQuery.isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              pathname !== "/login" && (
                <Button size="sm" asChild>
                  <Link href="/login">Log In</Link>
                </Button>
              )
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-shrink-0 md:flex-col md:border-r md:border-border">
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" className="text-sm font-semibold">
            TransitOps
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-between overflow-y-auto p-3">
          <NavLinks items={visibleItems} pathname={pathname} />
          <div className="border-t border-border pt-3">
            <p className="truncate px-3 text-sm font-medium">{sessionQuery.data?.name}</p>
            <p className="truncate px-3 text-xs text-muted-foreground">{sessionQuery.data?.role}</p>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <span className="text-sm font-semibold">TransitOps</span>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col">
              <SheetHeader>
                <SheetTitle>TransitOps</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 pb-4">
                <NavLinks items={visibleItems} pathname={pathname} onNavigate={() => setSheetOpen(false)} />
                <div className="border-t border-border pt-3">
                  <p className="truncate px-3 text-sm font-medium">{sessionQuery.data?.name}</p>
                  <p className="truncate px-3 text-xs text-muted-foreground">{sessionQuery.data?.role}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => {
                      setSheetOpen(false);
                      handleLogout();
                    }}
                  >
                    Log Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
