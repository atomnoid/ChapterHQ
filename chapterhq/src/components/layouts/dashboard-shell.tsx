"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardLogoutButton } from "@/features/auth/components/dashboard-logout-button";
import { cn } from "@/lib/utils";
import { GlobalSearchInput } from "@/features/dashboard/components/global-search-input";
import { filterNavItems } from "@/lib/filter-nav-items";
import { SIDEBAR_NAV_ITEMS } from "@/config/sidebar-nav";
import type { SidebarNavItem } from "@/config/sidebar-nav";
import { CommitteeSwitcher } from "@/features/committee/components/committee-switcher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DashboardUser = {
  name: string | null;
  email: string | null;
  image: string | null;
};

type DashboardShellProps = Readonly<{
  children: React.ReactNode;
  user: DashboardUser | null;
}>;

interface MePermissionsResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  roles: string[];
  permissions: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null) {
  if (!name) return "ME";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ME";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// ---------------------------------------------------------------------------
// Hook: fetch current user permissions from /api/me/permissions
// ---------------------------------------------------------------------------

function useMePermissions() {
  const [data, setData] = useState<MePermissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/me/permissions")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) setData(json ?? null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

// ---------------------------------------------------------------------------
// Route guard hook — redirects to /unauthorized if user navigates to a route
// they don't have permission for.
// ---------------------------------------------------------------------------

function useRouteGuard(
  allowedItems: SidebarNavItem[],
  permissionsLoaded: boolean
) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Wait until permissions are resolved before enforcing guards.
    if (!permissionsLoaded) return;

    // Check if the current pathname matches a guarded route.
    const guarded = SIDEBAR_NAV_ITEMS.find((item) =>
      pathname === item.route || pathname.startsWith(`${item.route}/`)
    );

    if (!guarded) return; // Not a guarded route — allow.

    const allowed = allowedItems.some(
      (item) =>
        pathname === item.route || pathname.startsWith(`${item.route}/`)
    );

    if (!allowed) {
      router.replace("/unauthorized");
    }
  }, [pathname, allowedItems, permissionsLoaded, router]);
}

// ---------------------------------------------------------------------------
// Sidebar nav list (shared between desktop and mobile)
// ---------------------------------------------------------------------------

function SidebarNavList({
  items,
  onNavigate,
}: {
  items: SidebarNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="mt-10 space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.route || pathname.startsWith(`${item.route}/`);

        return (
          <Link
            key={item.route}
            href={item.route}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-secondary-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
            {isActive && (
              <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Sidebar header: org name + role badge
// ---------------------------------------------------------------------------

function SidebarHeader({
  orgName,
  orgSlug,
  roleNames,
  loading,
}: {
  orgName: string | null;
  orgSlug: string | null;
  roleNames: string[];
  loading: boolean;
}) {
  const roleBadge = roleNames.length > 0 ? roleNames.join(", ") : null;

  return (
    <div className="space-y-3">
      {/* Org name */}
      <div className="px-2 pt-1">
        {loading ? (
          <>
            <div className="h-4 w-28 animate-pulse rounded-full bg-secondary/50" />
            <div className="mt-1.5 h-3 w-20 animate-pulse rounded-full bg-secondary/40" />
          </>
        ) : (
          <>
            <p className="truncate text-sm font-bold text-foreground leading-snug">
              {orgName ?? "My Organization"}
            </p>
            {orgSlug && (
              <p className="mt-0.5 text-[11px] text-secondary-foreground truncate">
                /{orgSlug}
              </p>
            )}
          </>
        )}
      </div>

      {/* Role badge */}
      {!loading && roleBadge && (
        <div className="px-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary leading-none">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
            {roleBadge}
          </span>
        </div>
      )}

      {loading && (
        <div className="px-2">
          <div className="h-5 w-24 animate-pulse rounded-full bg-secondary/40" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main shell
// ---------------------------------------------------------------------------

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const { data: meData, loading: meLoading } = useMePermissions();

  const displayName = useMemo(
    () => user?.name?.trim() || "Member",
    [user]
  );
  const displayEmail = useMemo(
    () => user?.email?.trim() || "Signed in account",
    [user]
  );
  const initials = useMemo(() => getInitials(user?.name ?? null), [user]);

  // Filter nav items based on resolved permissions.
  const allowedNavItems = useMemo(() => {
    if (meLoading || !meData) return [];
    return filterNavItems(SIDEBAR_NAV_ITEMS, meData.permissions);
  }, [meData, meLoading]);

  const permissionsLoaded = !meLoading;

  // Enforce route-level guard on client navigation.
  useRouteGuard(allowedNavItems, permissionsLoaded);

  const orgName = meData?.organization?.name ?? null;
  const orgSlug = meData?.organization?.slug ?? null;
  const roleNames = meData?.roles ?? [];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f4ec_0%,#fbf8f2_40%,#f8f4ec_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        {/* ── Desktop Sidebar ── */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border/80 bg-card/95 px-5 py-6 shadow-[10px_0_40px_rgba(77,54,37,0.04)] backdrop-blur-xl lg:flex lg:flex-col">
          {/* Org + Role header */}
          <SidebarHeader
            orgName={orgName}
            orgSlug={orgSlug}
            roleNames={roleNames}
            loading={meLoading}
          />

          {/* Committee context switcher */}
          <div className="mt-4">
            <CommitteeSwitcher />
          </div>

          {/* Navigation */}
          {meLoading ? (
            <div className="mt-6 space-y-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-2xl bg-secondary/40"
                />
              ))}
            </div>
          ) : (
            <SidebarNavList items={allowedNavItems} />
          )}

          {/* Org overview at the bottom */}
          <SidebarOrgOverview
            orgName={orgName}
            orgSlug={orgSlug}
            orgStatus={meData?.organization?.status ?? null}
            loading={meLoading}
          />
        </aside>

        {/* ── Main content area ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
            <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full border-border bg-card lg:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" />
              </Button>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.26em] text-secondary-foreground">
                  {orgName ? orgName : "Dashboard"}
                </p>
                <h1 className="mt-1 truncate text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">
                  {roleNames.length > 0 ? roleNames.join(", ") : "Workspace"}
                </h1>
              </div>

              <div className="hidden min-w-[18rem] max-w-md flex-1 lg:block">
                <GlobalSearchInput />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Link href="/notifications" aria-label="Notifications">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full border-border bg-card text-foreground"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                </Link>

                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-full border-border bg-card px-3 text-left text-foreground shadow-none"
                    onClick={() => setIsProfileMenuOpen((v) => !v)}
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="menu"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {user?.image ? (
                          <img
                            src={user.image}
                            alt="User avatar"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </span>
                      <span className="hidden text-left sm:block">
                        <span className="block max-w-40 truncate text-sm font-medium text-foreground">
                          {displayName}
                        </span>
                        <span className="block max-w-40 truncate text-xs text-secondary-foreground">
                          {displayEmail}
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 text-secondary-foreground" />
                    </span>
                  </Button>

                  {isProfileMenuOpen ? (
                    <div className="absolute right-0 top-[calc(100%+0.75rem)] w-72 overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-[0_18px_50px_rgba(77,54,37,0.12)]">
                      <div className="rounded-2xl bg-[#fcf8f1] px-4 py-4">
                        <p className="text-sm font-semibold text-foreground">
                          {displayName}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-secondary-foreground">
                          {displayEmail}
                        </p>
                        {roleNames.length > 0 && (
                          <p className="mt-1.5 text-[11px] font-semibold text-primary">
                            {roleNames.join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="mt-2 space-y-1">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          <span>Account settings</span>
                        </button>

                        <div onClick={() => setIsProfileMenuOpen(false)}>
                          <DashboardLogoutButton>
                            <LogOut className="h-4 w-4" />
                            Logout
                          </DashboardLogoutButton>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <main className="mx-auto w-full max-w-7xl">{children}</main>
          </div>
        </div>

        {/* ── Mobile overlay ── */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-foreground/35 backdrop-blur-[2px] transition-opacity lg:hidden",
            isMobileSidebarOpen
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          )}
          onClick={() => setIsMobileSidebarOpen(false)}
        />

        {/* ── Mobile Sidebar ── */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(86vw,20rem)] border-r border-border bg-card px-5 py-6 shadow-[18px_0_45px_rgba(77,54,37,0.12)] transition-transform duration-300 ease-out lg:hidden",
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Mobile header */}
          <div className="flex items-center justify-between">
            <SidebarHeader
              orgName={orgName}
              orgSlug={orgSlug}
              roleNames={roleNames}
              loading={meLoading}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-full border-border bg-card"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Committee context switcher — mobile */}
          <div className="mt-4">
            <CommitteeSwitcher
              onNavigate={() => setIsMobileSidebarOpen(false)}
            />
          </div>

          {/* Signed-in card */}
          <div className="mt-4 rounded-[1.5rem] border border-border bg-[#fcf8f1] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">
              Signed in as
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="mt-1 text-xs leading-5 text-secondary-foreground">
              {displayEmail}
            </p>
          </div>

          {/* Mobile nav */}
          {meLoading ? (
            <div className="mt-8 space-y-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-2xl bg-secondary/40"
                />
              ))}
            </div>
          ) : (
            <div className="mt-8 space-y-0.5">
              {allowedNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.route}
                    href={item.route}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    onClick={() => setIsMobileSidebarOpen(false)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                    <ChevronDown className="ml-auto h-3.5 w-3.5 -rotate-90 text-secondary-foreground" />
                  </Link>
                );
              })}
            </div>
          )}

          {/* Mobile footer */}
          <div className="mt-auto space-y-3 pt-6">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full border-border bg-card text-foreground"
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <Search className="mr-2 h-4 w-4" />
              Search workspace
            </Button>

            <div onClick={() => setIsMobileSidebarOpen(false)}>
              <DashboardLogoutButton>
                <LogOut className="h-4 w-4" />
                Logout
              </DashboardLogoutButton>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar org overview card (desktop bottom)
// ---------------------------------------------------------------------------

function SidebarOrgOverview({
  orgName,
  orgSlug,
  orgStatus,
  loading,
}: {
  orgName: string | null;
  orgSlug: string | null;
  orgStatus: string | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="mt-auto rounded-[1.5rem] border border-border bg-[#fcf8f1] p-4">
        <div className="h-3 w-20 animate-pulse rounded-full bg-secondary/50" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded-full bg-secondary/40" />
        <div className="mt-1 h-3 w-16 animate-pulse rounded-full bg-secondary/30" />
      </div>
    );
  }

  if (!orgName) return null;

  return (
    <div className="mt-auto rounded-[1.5rem] border border-border bg-[#fcf8f1] p-4 shadow-[0_16px_40px_rgba(77,54,37,0.06)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-secondary-foreground">
        Organization
      </p>
      <div className="mt-2.5 space-y-1.5">
        <div>
          <p className="text-sm font-bold text-foreground truncate">{orgName}</p>
          {orgSlug && (
            <p className="text-xs text-secondary-foreground">/{orgSlug}</p>
          )}
        </div>
        {orgStatus && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {orgStatus}
          </span>
        )}
      </div>
    </div>
  );
}