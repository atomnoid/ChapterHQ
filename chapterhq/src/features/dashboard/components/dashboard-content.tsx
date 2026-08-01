"use client";

import { useEffect, useState } from "react";
import {
  Building2, Shield, UserCheck, Users, RefreshCw, LayoutGrid, DollarSign,
  Package, Bell, CalendarDays, CheckCircle, ArrowUpRight, ArrowDownRight, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

interface Member {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface AppNotification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User and Org info
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
  const [userRole, setUserRole] = useState<string>("Volunteer");
  
  // Permission checks
  const [permissions, setPermissions] = useState({
    canReadMembers: false,
    canReadFinance: false,
    canReadInventory: false,
    canReadEvents: false,
  });

  // Data states
  const [membersCount, setMembersCount] = useState<number>(0);
  const [recentMembers, setRecentMembers] = useState<any[]>([]);
  const [rolesCount, setRolesCount] = useState<number>(0);
  const [financeSummary, setFinanceSummary] = useState<{ totalIncome: number; totalExpense: number; balance: number } | null>(null);
  const [inventoryCount, setInventoryCount] = useState<number>(0);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Session Info
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const currentUserEmail = session?.user?.email;
      const currentUserId = session?.user?.id;

      // 2. Fetch Organization Settings (any logged in member can access)
      const orgRes = await fetch("/api/organization/settings");
      if (!orgRes.ok) throw new Error("Failed to load organization settings.");
      const orgData = await orgRes.json();
      setOrgInfo(orgData);

      // 3. Probative Permission & Data Fetches
      const [membersRes, financeRes, inventoryRes, eventsRes, notificationsRes] = await Promise.all([
        fetch("/api/members?limit=5"),
        fetch("/api/finance/summary"),
        fetch("/api/inventory?limit=5"),
        fetch("/api/events?limit=5"),
        fetch("/api/notifications?limit=5"),
      ]);

      const canReadMembers = membersRes.ok;
      const canReadFinance = financeRes.ok;
      const canReadInventory = inventoryRes.ok;
      const canReadEvents = eventsRes.ok;

      setPermissions({
        canReadMembers,
        canReadFinance,
        canReadInventory,
        canReadEvents,
      });

      // 4. Resolve Roles
      if (canReadMembers && currentUserEmail) {
        const membersData = await membersRes.json();
        const items = membersData.items ?? membersData.data?.items ?? [];
        setRecentMembers(items);
        setMembersCount(membersData.total ?? items.length);

        // Find current member ID
        const currentMember = items.find((m: Member) => m.user?.email === currentUserEmail || m.user?.id === currentUserId);
        if (currentMember) {
          const rolesRes = await fetch(`/api/members/${currentMember.id}/roles`);
          if (rolesRes.ok) {
            const rolesJson = await rolesRes.json();
            const roles = rolesJson?.items ?? rolesJson?.data ?? rolesJson ?? [];
            if (roles.length > 0) {
              setUserRole(roles.map((r: any) => r.name ?? r.role?.name).join(", "));
            } else {
              setUserRole("President"); // fallback for members:read success
            }
          }
        } else {
          setUserRole("President");
        }

        // Fetch general roles count
        const allRolesRes = await fetch("/api/roles?limit=1");
        if (allRolesRes.ok) {
          const allRolesJson = await allRolesRes.json();
          setRolesCount(allRolesJson.total ?? allRolesJson.data?.total ?? 0);
        }
      } else {
        setUserRole("Volunteer");
      }

      // Populate Finance data
      if (canReadFinance) {
        const finJson = await financeRes.json();
        setFinanceSummary(finJson?.data ?? finJson);
      }

      // Populate Inventory data
      if (canReadInventory) {
        const invJson = await inventoryRes.json();
        const items = invJson.items ?? invJson.data?.items ?? [];
        setInventoryCount(invJson.total ?? items.length);
      }

      // Populate Events data
      if (canReadEvents) {
        const evJson = await eventsRes.json();
        const items = evJson.items ?? evJson.data?.items ?? [];
        setEventsList(items);
      }

      // Populate Notifications data
      if (notificationsRes.ok) {
        const notifJson = await notificationsRes.json();
        const items = notifJson.items ?? notifJson.data?.items ?? [];
        setNotifications(items);
      }

    } catch (err: any) {
      setError(err.message ?? "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 animate-pulse bg-secondary/40 rounded-full" />
          <div className="h-5 w-32 animate-pulse bg-secondary/40 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-secondary/40 border border-border" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-[2rem] bg-secondary/40 border border-border" />
          <div className="h-64 animate-pulse rounded-[2rem] bg-secondary/40 border border-border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-border bg-destructive/5 px-6 py-8 text-center">
        <p className="text-sm font-semibold text-destructive">{error}</p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={fetchDashboardData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Header: Organization Name + Role Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold tracking-[-0.05em] text-foreground">
            {orgInfo?.name ?? "My Organization"}
          </h2>
          <p className="mt-1 text-sm text-secondary-foreground">
            Active workspace context
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
          <Shield className="h-4 w-4" />
          {userRole}
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {permissions.canReadMembers ? (
          <>
            <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Total Members</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{membersCount}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-blue-600 bg-blue-50 border-blue-100">
                <Users className="h-5 w-5" />
              </span>
            </article>
            <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Custom Roles</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{rolesCount}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-amber-600 bg-amber-50 border-amber-100">
                <Shield className="h-5 w-5" />
              </span>
            </article>
          </>
        ) : (
          <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Assigned Tasks/Events</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{eventsList.length}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-blue-600 bg-blue-50 border-blue-100">
              <CalendarDays className="h-5 w-5" />
            </span>
          </article>
        )}

        {permissions.canReadFinance && financeSummary ? (
          <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Net Balance</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                ${financeSummary.balance.toLocaleString()}
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-emerald-600 bg-emerald-50 border-emerald-100">
              <DollarSign className="h-5 w-5" />
            </span>
          </article>
        ) : (
          <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Attendance Status</p>
              <p className="mt-2 text-xl font-semibold text-foreground">Active Member</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-emerald-600 bg-emerald-50 border-emerald-100">
              <UserCheck className="h-5 w-5" />
            </span>
          </article>
        )}

        {permissions.canReadInventory ? (
          <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Inventory Items</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{inventoryCount}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-purple-600 bg-purple-50 border-purple-100">
              <Package className="h-5 w-5" />
            </span>
          </article>
        ) : (
          <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Active Workspace</p>
              <p className="mt-2 text-xl font-semibold text-foreground">/{orgInfo?.slug}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border text-purple-600 bg-purple-50 border-purple-100">
              <Building2 className="h-5 w-5" />
            </span>
          </article>
        )}
      </div>

      {/* Main Grid: Adapts to permissions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Left/Middle Column(s) */}
        <div className="space-y-6 md:col-span-2">
          {permissions.canReadMembers ? (
            <article className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-secondary-foreground">Roster</p>
                  <h3 className="mt-1 text-xl font-bold tracking-[-0.04em] text-foreground">Recent Members</h3>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.location.href = "/members"}>
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentMembers.slice(0, 4).map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-border bg-[#fcf8f1] p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {member.user?.name?.[0]?.toUpperCase() ?? member.user?.email?.[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{member.user?.name ?? "New Member"}</p>
                      <p className="truncate text-xs text-secondary-foreground">{member.user?.email}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-0.5 border border-emerald-100">
                      {member.status.toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ) : (
            <article className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-secondary-foreground">Calendar</p>
                  <h3 className="mt-1 text-xl font-bold tracking-[-0.04em] text-foreground">Assigned Events</h3>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.location.href = "/events"}>
                  View All
                </Button>
              </div>
              {eventsList.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 mx-auto text-secondary-foreground/60 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No events scheduled</p>
                  <p className="text-xs text-secondary-foreground">Check back later for newly scheduled activities.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventsList.map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-[#fcf8f1] p-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
                        <p className="truncate text-xs text-secondary-foreground">
                          {event.startDate ? new Date(event.startDate).toLocaleDateString() : "No Date"}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5 border border-primary/20">
                        {event.status.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}

          {permissions.canReadFinance && financeSummary && (
            <div className="grid gap-6 sm:grid-cols-2">
              <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-emerald-600 bg-emerald-50 border-emerald-100">
                  <ArrowUpRight className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Total Income</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">${financeSummary.totalIncome.toLocaleString()}</p>
                </div>
              </article>
              <article className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-rose-600 bg-rose-50 border-rose-100">
                  <ArrowDownRight className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">Total Expense</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">${financeSummary.totalExpense.toLocaleString()}</p>
                </div>
              </article>
            </div>
          )}
        </div>

        {/* Right-side Notifications Panel */}
        <article className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-secondary-foreground">Activity</p>
                <h3 className="mt-1 text-xl font-bold tracking-[-0.04em] text-foreground">Notifications</h3>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-secondary-foreground" onClick={() => window.location.href = "/notifications"}>
                <Bell className="h-4 w-4" />
              </Button>
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-secondary-foreground">
                <CheckCircle className="h-8 w-8 text-secondary-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">All caught up!</p>
                <p className="text-xs">No recent notifications found.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`rounded-xl border p-3 flex flex-col gap-1 transition-all ${
                    notif.isRead ? "bg-[#fcf8f1]/50 border-border/50" : "bg-primary/5 border-primary/20"
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold truncate ${notif.isRead ? "text-foreground" : "text-primary"}`}>
                        {notif.title}
                      </p>
                      <span className="text-[9px] text-secondary-foreground shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {notif.message && (
                      <p className="text-[11px] text-secondary-foreground line-clamp-2">{notif.message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" className="w-full mt-6 rounded-full border-border" onClick={() => window.location.href = "/notifications"}>
            Open Inbox
          </Button>
        </article>
      </div>
    </div>
  );
}
