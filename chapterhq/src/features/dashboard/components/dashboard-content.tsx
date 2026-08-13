"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FilePlus,
  Users,
  Award,
  DollarSign,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  ChevronRight,
  AlertTriangle,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASHBOARD_WIDGETS } from "@/config/dashboard-widgets";
import type { DashboardWidget } from "@/config/dashboard-widgets";

// ---------------------------------------------------------------------------
// Config Mappings
// ---------------------------------------------------------------------------

interface QuickAction {
  label: string;
  route: string;
  permission: string;
  icon: LucideIcon;
}

interface EventSummaryItem {
  id: string;
  title: string;
  startDate?: string;
  status?: string;
}

interface NotificationSummaryItem {
  id: string;
  title: string;
  message?: string;
  createdAt?: string;
}

interface AuditLogSummaryItem {
  id: string;
  actorEmail?: string | null;
  actorName?: string | null;
  action: string;
  resource: string;
  targetName?: string | null;
  createdAt: string;
}

type DashboardApiResponse<T> = {
  items?: T[];
  total?: number;
  data?: {
    items?: T[];
    total?: number;
  };
};

type FinanceSummary = { totalIncome: number; totalExpense: number; netBalance?: number; balance?: number };

const inrCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Invite Member",
    route: "/members",
    permission: "members:create",
    icon: Plus,
  },
  {
    label: "Create Event",
    route: "/events",
    permission: "events:create",
    icon: Calendar,
  },
  {
    label: "Create Committee",
    route: "/committees",
    permission: "committees:create",
    icon: Layers,
  },
  {
    label: "Generate Certificate",
    route: "/certificates",
    permission: "certificates:create",
    icon: Award,
  },
  {
    label: "Add Transaction",
    route: "/finance",
    permission: "finance:create",
    icon: DollarSign,
  },
  {
    label: "Export Report",
    route: "/reports",
    permission: "reports:read",
    icon: FilePlus,
  },
  {
    label: "View Assigned Events",
    route: "/events",
    permission: "events:read",
    icon: CalendarDays,
  },
  {
    label: "Mark Attendance",
    route: "/attendance",
    permission: "attendance:create",
    icon: CheckCircle,
  },
];

interface MePermissionsResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  roles: string[];
  assignedRoleCount: number;
  permissions: string[];
}

export function DashboardContent() {
  const { data: session } = useSession();
  // Stable primitive keys - changes here must trigger a full data re-fetch.
  const activeOrganizationId = session?.activeOrganizationId ?? null;
  const activeCommitteeId = session?.activeCommitteeId ?? null;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User details resolved dynamically from /api/me/permissions
  const [meData, setMeData] = useState<MePermissionsResponse | null>(null);

  // Statistics & lists fetched conditionally based on permissions
  const [membersCount, setMembersCount] = useState<number>(0);
  const [rolesCount, setRolesCount] = useState<number>(0);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [inventoryCount, setInventoryCount] = useState<number>(0);
  const [eventsList, setEventsList] = useState<EventSummaryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationSummaryItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogSummaryItem[]>([]);

  // Current date
  const currentDateString = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch permissions, roles, and org info via `/api/me/permissions`
      const meRes = await fetch("/api/me/permissions");
      if (!meRes.ok) {
        throw new Error("Failed to load user permissions context.");
      }
      const permissionsResponse: MePermissionsResponse = await meRes.json();
      setMeData(permissionsResponse);

      const userPermissions = new Set(permissionsResponse.permissions);

      // Helper to check permissions
      const hasPerm = (p: string) => userPermissions.has(p);

      // 2. Fetch allowed datasets in parallel
      const fetches: Promise<unknown>[] = [];
      const fetchKeys: string[] = [];

      if (hasPerm("members:read")) {
        fetches.push(fetch("/api/members?limit=5").then((r) => r.json()));
        fetchKeys.push("members");
      }
      if (hasPerm("roles:read")) {
        fetches.push(fetch("/api/roles?limit=1").then((r) => r.json()));
        fetchKeys.push("roles");
      }
      if (hasPerm("finance:read")) {
        fetches.push(fetch("/api/finance/summary").then((r) => r.json()));
        fetchKeys.push("finance");
      }
      if (hasPerm("inventory:read")) {
        fetches.push(fetch("/api/inventory?limit=5").then((r) => r.json()));
        fetchKeys.push("inventory");
      }
      if (hasPerm("events:read")) {
        fetches.push(fetch("/api/events?limit=5").then((r) => r.json()));
        fetchKeys.push("events");
      }
      if (hasPerm("notifications:read")) {
        fetches.push(fetch("/api/notifications?limit=5").then((r) => r.json()));
        fetchKeys.push("notifications");
      }
      if (hasPerm("audit-logs:read")) {
        fetches.push(fetch("/api/audit-logs?limit=5").then((r) => r.json()));
        fetchKeys.push("audit-logs");
      }

      const results = await Promise.all(fetches);

      // 3. Map results back to local state
      results.forEach((data, index) => {
        const key = fetchKeys[index];
        if (key === "members") {
          const response = data as DashboardApiResponse<unknown>;
          const items = response.items ?? response.data?.items ?? [];
          setMembersCount(response.total ?? items.length);
        } else if (key === "roles") {
          const response = data as DashboardApiResponse<unknown>;
          setRolesCount(response.total ?? response.data?.total ?? 0);
        } else if (key === "finance") {
          const response = data as { data?: FinanceSummary };
          if (response.data) {
            setFinanceSummary(response.data);
          } else {
            setFinanceSummary(data as FinanceSummary);
          }
        } else if (key === "inventory") {
          const response = data as DashboardApiResponse<unknown>;
          const items = response.items ?? response.data?.items ?? [];
          setInventoryCount(response.total ?? items.length);
        } else if (key === "events") {
          const response = data as DashboardApiResponse<EventSummaryItem>;
          const items = response.items ?? response.data?.items ?? [];
          setEventsList(items);
        } else if (key === "notifications") {
          const response = data as DashboardApiResponse<NotificationSummaryItem>;
          const items = response.items ?? response.data?.items ?? [];
          setNotifications(items);
        } else if (key === "audit-logs") {
          const response = data as DashboardApiResponse<AuditLogSummaryItem>;
          const items = response.items ?? response.data?.items ?? [];
          setAuditLogs(items);
        }
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever the active organization or committee changes.
  useEffect(() => {
    fetchDashboardData();
  }, [activeOrganizationId, activeCommitteeId]);

  // Filter allowed widgets
  const allowedWidgets = useMemo(() => {
    if (!meData) return [];
    const permSet = new Set(meData.permissions);
    return DASHBOARD_WIDGETS.filter((w) => permSet.has(w.permission));
  }, [meData]);

  // Filter allowed quick actions
  const allowedQuickActions = useMemo(() => {
    if (!meData) return [];
    const permSet = new Set(meData.permissions);
    return QUICK_ACTIONS.filter((qa) => permSet.has(qa.permission));
  }, [meData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3">
          <div className="h-4 w-40 animate-pulse bg-secondary/40 rounded-full" />
          <div className="h-8 w-72 animate-pulse bg-secondary/40 rounded-full" />
          <div className="h-4 w-52 animate-pulse bg-secondary/40 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-secondary/40 border border-border" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-80 md:col-span-2 animate-pulse rounded-[2rem] bg-secondary/40 border border-border" />
          <div className="h-80 animate-pulse rounded-[2rem] bg-secondary/40 border border-border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-border bg-destructive/5 px-6 py-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <p className="text-sm font-semibold text-destructive">{error}</p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={fetchDashboardData}>
          Retry
        </Button>
      </div>
    );
  }

  const orgName = meData?.organization?.name ?? "My Organization";
  const userRole = meData?.roles?.join(", ") || "Member";
  const userName = session?.user?.name || session?.user?.email || "Member";

  return (
    <div className="space-y-8">
      {/* Dynamic Welcome Section */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8">
        <div className="absolute inset-y-0 right-0 -z-10 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(176,137,104,0.08),transparent_50%)]" />
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-secondary-foreground">
                {orgName}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                {userRole}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.04em] text-foreground sm:text-3xl">
              Welcome back, {userName}
            </h2>
            <p className="text-sm text-secondary-foreground">
              Have a wonderful day managing your organization resources.
            </p>
          </div>
          
          <div className="text-left sm:text-right shrink-0 border-t border-border/60 pt-3 sm:border-t-0 sm:pt-0">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary-foreground block">
              Today
            </span>
            <span className="text-sm font-bold text-foreground mt-1 block">
              {currentDateString}
            </span>
          </div>
        </div>
      </section>
      {/* Dynamic Statistics Rows (Conditional render) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {meData?.permissions.includes("members:read") && (
          <>
            <article className="rounded-3xl border border-border bg-card p-5 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Total Members</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{membersCount}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-blue-600 bg-blue-50 border-blue-100">
                <Users className="h-5 w-5" />
              </span>
            </article>

            <article className="rounded-3xl border border-border bg-card p-5 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Organization Roles</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{rolesCount}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-amber-600 bg-amber-50 border-amber-100">
                <Shield className="h-5 w-5" />
              </span>
            </article>

            <article className="rounded-3xl border border-border bg-card p-5 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">My Roles</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{meData?.assignedRoleCount ?? 0}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-purple-600 bg-purple-50 border-purple-100">
                <Shield className="h-5 w-5" />
              </span>
            </article>
          </>
        )}

        {meData?.permissions.includes("finance:read") && financeSummary && (
          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Ledger Balance</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                {inrCurrency.format(Number(financeSummary.netBalance ?? financeSummary.balance ?? 0))}
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-emerald-600 bg-emerald-50 border-emerald-100">
              <DollarSign className="h-5 w-5" />
            </span>
          </article>
        )}

        {meData?.permissions.includes("inventory:read") && (
          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Inventory Items</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{inventoryCount}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-purple-600 bg-purple-50 border-purple-100">
              <TrendingUp className="h-5 w-5" />
            </span>
          </article>
        )}
      </div>
      {/* Dynamic Quick Actions */}
      {allowedQuickActions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-secondary-foreground">Quick Actions</h3>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
            {allowedQuickActions.map((qa) => {
              const ActionIcon = qa.icon;
              return (
                <button
                  key={qa.label}
                  type="button"
                  onClick={() => window.location.href = qa.route}
                  className="group flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/20 hover:shadow-md transition-all"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fcf8f1] border border-border text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                    <ActionIcon className="h-4 w-4" />
                  </span>
                  <span className="mt-2.5 text-xs font-semibold text-foreground truncate max-w-full">
                    {qa.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
      {/* Main Layout: Widgets Grid vs Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Modules Section */}
        <section className="space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-secondary-foreground">Permitted Modules</h3>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {allowedWidgets.map((widget) => {
              const WidgetIcon = widget.icon;
              return (
                <article
                  key={widget.id}
                  onClick={() => window.location.href = widget.route}
                  className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/20 hover:shadow-md transition-all flex items-start gap-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fcf8f1] border border-border text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                    <WidgetIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                      {widget.title}
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <p className="mt-1 text-xs text-secondary-foreground leading-normal line-clamp-2">
                      {widget.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Dynamic Activity/Audit Logs Section */}
        {meData?.permissions.includes("audit-logs:read") && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-secondary-foreground">Recent Audit Activity</h3>
            </div>

            <article className="rounded-3xl border border-border bg-card p-5 shadow-sm space-y-4">
              {auditLogs.length === 0 ? (
                <div className="text-center py-10 text-secondary-foreground">
                  <Clock className="h-7 w-7 mx-auto opacity-50 mb-2" />
                  <p className="text-xs">No recent actions logged.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate max-w-[120px]">
                          {log.actorEmail || log.actorName || "System"}
                        </span>
                        <span className="text-[10px] text-secondary-foreground shrink-0">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-secondary-foreground leading-normal">
                        Performed <strong className="text-foreground">{log.action}</strong> on {log.resource}{" "}
                        {log.targetName && <span className="italic">(&quot;{log.targetName}&quot;)</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        )}
      </div>
    </div>
  );
}
