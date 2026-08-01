export const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"] as const;

export const PROTECTED_ROUTES = ["/dashboard", "/members", "/roles", "/organizations", "/committees", "/appointments", "/events", "/attendance", "/finance", "/inventory", "/certificates", "/notifications", "/onboarding"] as const;

export const PUBLIC_ROUTES = ["/"] as const;

export const DEFAULT_AUTHENTICATED_REDIRECT = "/dashboard";
export const DEFAULT_UNAUTHENTICATED_REDIRECT = "/login";
