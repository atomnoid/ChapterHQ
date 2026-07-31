"use client";

import { useEffect, useState } from "react";
import { Building2, Shield, UserCheck, Users, Link2, RefreshCw, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SummaryData {
  totalMembers: number;
  totalRoles: number;
  totalPermissions: number;
  currentUserRoleCount: number;
}

interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

interface RecentMember {
  id: string;
  joinedAt: string;
  status: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface RecentRole {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  createdAt: string;
}

export function DashboardContent() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [recentRoles, setRecentRoles] = useState<RecentRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, orgRes, membersRes, rolesRes] = await Promise.all([
        fetch("/api/dashboard/summary"),
        fetch("/api/organization/settings"),
        fetch("/api/members?limit=4"),
        fetch("/api/roles?limit=4"),
      ]);

      if (!summaryRes.ok || !orgRes.ok || !membersRes.ok || !rolesRes.ok) {
        throw new Error("Failed to load dashboard data. Check your permissions.");
      }

      const summaryData = await summaryRes.json();
      const orgData = await orgRes.json();
      const membersData = await membersRes.json();
      const rolesData = await rolesRes.json();

      setSummary(summaryData);
      setOrgInfo(orgData);
      setRecentMembers(membersData.items ?? []);
      setRecentRoles(rolesData.items ?? []);
    } catch (err: any) {
      setError(err.message ?? "An error occurred while loading dashboard widgets.");
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
        <p className="text-xs text-secondary-foreground mt-1">Please ensure you have members:read, roles:read, and dashboard:read permissions.</p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={fetchDashboardData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Members", value: summary?.totalMembers ?? 0, icon: Users, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Custom Roles", value: summary?.totalRoles ?? 0, icon: Shield, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Permissions Live", value: summary?.totalPermissions ?? 0, icon: LayoutGrid, color: "text-purple-600 bg-purple-50 border-purple-100" },
          { label: "My Role Assignments", value: summary?.currentUserRoleCount ?? 0, icon: UserCheck, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className="rounded-3xl border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.04)] flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-secondary-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                  {stat.value}
                </p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </span>
            </article>
          );
        })}
      </div>

      {/* 2. Main Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Organization Info Card */}
        <article className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
                Active Context
              </p>
              <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-foreground">
                {orgInfo?.name}
              </h3>
            </div>
            <div className="space-y-2 border-t border-border/60 pt-4 text-sm text-secondary-foreground">
              <div className="flex justify-between">
                <span>Unique Slug:</span>
                <span className="font-medium text-foreground">/{orgInfo?.slug}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-semibold text-emerald-600 capitalize">{orgInfo?.status.toLowerCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Joined On:</span>
                <span>{orgInfo?.createdAt ? new Date(orgInfo.createdAt).toLocaleDateString() : "—"}</span>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-6 rounded-full gap-2 border-border" onClick={() => window.location.href = "/organizations"}>
            <Building2 className="h-4 w-4" />
            Switch Workspace
          </Button>
        </article>

        {/* Quick Actions Card */}
        <article className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
              Quick Shortcuts
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-foreground">
              Manage Assets
            </h3>
          </div>
          <div className="mt-6 space-y-3">
            {[
              { label: "View Members List", href: "/members", icon: Users },
              { label: "Roles Management", href: "/roles", icon: Shield },
              { label: "Edit Permission Matrix", href: "/roles/permissions", icon: Link2 },
              { label: "Organization Settings", href: "/organizations", icon: Building2 },
            ].map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.label}
                  onClick={() => window.location.href = act.href}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-[#fcf8f1] px-4 py-3.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary hover:translate-x-1"
                >
                  <Icon className="h-4 w-4 text-secondary-foreground" />
                  <span>{act.label}</span>
                </button>
              );
            })}
          </div>
        </article>

        {/* Recent Members & Roles Widget */}
        <article className="rounded-[2rem] border border-border bg-card p-6 shadow-[0_20px_60px_rgba(77,54,37,0.06)] sm:p-8 md:col-span-2 lg:col-span-1">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
              Latest Additions
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-foreground">
              Recent Members
            </h3>
          </div>

          <div className="mt-6 space-y-3">
            {recentMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-border bg-[#fcf8f1] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {member.user.name?.[0]?.toUpperCase() ?? member.user.email?.[0]?.toUpperCase() ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {member.user.name ?? "New Member"}
                  </p>
                  <p className="truncate text-xs text-secondary-foreground">
                    {member.user.email}
                  </p>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 border border-emerald-100">
                  {member.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
