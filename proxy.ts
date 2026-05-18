import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/privacy",
  "/security",
  "/cookies",
];
const AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"];
const ADMIN_ROUTES = ["/admin"];
const APP_ROUTES = ["/app"];

export default auth((req: NextRequest & { auth: { user?: { role?: string; onboardingCompleted?: boolean } } | null }) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const session = req.auth;
  const isLoggedIn = !!session?.user;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route);
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isAppRoute = APP_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute) {
    if (isLoggedIn) {
      if (session?.user?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", nextUrl));
      }

      const onboardingCompleted = session?.user?.onboardingCompleted;
      if (!onboardingCompleted) {
        return NextResponse.redirect(new URL("/app/onboarding", nextUrl));
      }
      return NextResponse.redirect(new URL("/app", nextUrl));
    }
    return NextResponse.next();
  }

  if (isAdminRoute) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(`${pathname}${nextUrl.search}`);
      return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${callbackUrl}`, nextUrl));
    }
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/app", nextUrl));
    }
    return NextResponse.next();
  }

  if (isAppRoute) {
    if (!isLoggedIn) {
      const callbackUrl = encodeURIComponent(pathname);
      return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${callbackUrl}`, nextUrl));
    }

    if (session?.user?.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", nextUrl));
    }

    const onboardingCompleted = session?.user?.onboardingCompleted;
    const isOnboardingRoute = nextUrl.pathname === "/app/onboarding";

    if (!onboardingCompleted && !isOnboardingRoute) {
      return NextResponse.redirect(new URL("/app/onboarding", nextUrl));
    }

    if (onboardingCompleted && isOnboardingRoute) {
      return NextResponse.redirect(new URL("/app", nextUrl));
    }

    return NextResponse.next();
  }

  if (!isPublicRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|.*\\..*).*)",
  ],
};
