import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  AUTH_ROUTES,
  DEFAULT_AUTHENTICATED_REDIRECT,
  DEFAULT_UNAUTHENTICATED_REDIRECT,
  PROTECTED_ROUTES,
} from "@/constants/routes";

function isRouteMatch(pathname: string, routes: readonly string[]) {
  return routes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  const isAuthenticated = Boolean(token);
  const isAuthRoute = isRouteMatch(pathname, AUTH_ROUTES);
  const isProtectedRoute = isRouteMatch(pathname, PROTECTED_ROUTES);

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(
      new URL(DEFAULT_AUTHENTICATED_REDIRECT, request.url)
    );
  }

  if (isProtectedRoute && !isAuthenticated) {
    const callbackUrl = `${pathname}${search}`;
    const redirectUrl = new URL(DEFAULT_UNAUTHENTICATED_REDIRECT, request.url);

    redirectUrl.searchParams.set("callbackUrl", callbackUrl);

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/forgot-password"],
};