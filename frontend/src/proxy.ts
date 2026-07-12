import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { can, permissionForPath } from "@/lib/permissions";

// Must match backend/src/controllers/auth.controller.js — same secret, same
// algorithm (jsonwebtoken defaults to HS256), so a token signed by the
// Express API verifies here too. Set in frontend/.env.local; never prefix
// with NEXT_PUBLIC_ or it would ship to the browser bundle.
const JWT_SECRET = process.env.JWT_SECRET;

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const permission = permissionForPath(pathname);

  // Not a permission-gated route — nothing to enforce here.
  if (!permission) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  if (!token || !JWT_SECRET) {
    return redirectToLogin(request, pathname);
  }

  let role: string | undefined;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    role = typeof decoded === "object" && decoded !== null ? (decoded as { role?: string }).role : undefined;
  } catch {
    // Invalid or expired token.
    return redirectToLogin(request, pathname);
  }

  // Token is valid, but this role isn't permitted for this route. This is
  // an optimistic, edge-layer check against the JWT's role claim alone (no
  // DB lookup here — Proxy isn't meant for that) — the real enforcement is
  // still the backend's authorize() middleware, which also checks
  // isActive/lockedUntil. Redirect before any page content renders.
  if (!can(role, permission)) {
    const deniedUrl = new URL("/dashboard", request.url);
    deniedUrl.searchParams.set("denied", pathname);
    return NextResponse.redirect(deniedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analytics/:path*",
    "/fuel-expenses/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
