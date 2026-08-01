"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Check, CheckCheck, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AppNotification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

interface PaginatedNotifications {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-emerald-100 text-emerald-700",
  WARNING: "bg-amber-100 text-amber-700",
  ERROR: "bg-destructive/10 text-destructive",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationList() {
  const [data, setData] = useState<PaginatedNotifications | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [page, setPage] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);
  const LIMIT = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (filter === "UNREAD") params.set("isRead", "false");
      if (filter === "READ") params.set("isRead", "true");
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to load notifications.");
      const json = await res.json();
      setData(json?.data ?? json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    fetchData();
  }

  async function deleteNotification(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    fetchData();
  }

  async function markAllRead() {
    setBulkLoading(true);
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setBulkLoading(false);
    fetchData();
  }

  const unreadCount = data?.items.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-[1rem] border border-border bg-secondary/40 p-1">
          {(["ALL", "UNREAD", "READ"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`rounded-[0.75rem] px-4 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-secondary-foreground hover:text-foreground"
              }`}
            >
              {f === "ALL" ? "All" : f === "UNREAD" ? "Unread" : "Read"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={markAllRead} disabled={bulkLoading}>
              {bulkLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Mark all read
            </Button>
          )}
          <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={fetchData} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchData}>Try again</Button>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 rounded-[1.25rem] border border-border bg-card px-5 py-4">
              <div className="h-9 w-9 bg-secondary rounded-full animate-pulse shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-3.5 w-48 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-64 bg-secondary/60 rounded animate-pulse" />
              </div>
              <div className="h-4 w-16 bg-secondary/50 rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <BellOff className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No notifications</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {filter !== "ALL" ? "No notifications match this filter." : "You're all caught up!"}
          </p>
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 rounded-[1.25rem] border border-border px-5 py-4 transition-colors ${
                notif.isRead ? "bg-card" : "bg-primary/5 border-primary/20"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5 ${
                notif.isRead ? "bg-secondary" : "bg-primary/10"
              }`}>
                <Bell className={`h-4 w-4 ${notif.isRead ? "text-secondary-foreground" : "text-primary"}`} />
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${notif.isRead ? "text-foreground" : "text-primary"}`}>
                    {notif.title}
                    {!notif.isRead && (
                      <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-primary align-middle" />
                    )}
                  </p>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[notif.type] ?? "bg-secondary text-secondary-foreground"}`}>
                    {notif.type}
                  </span>
                </div>
                {notif.message && (
                  <p className="mt-0.5 text-sm text-secondary-foreground line-clamp-2">{notif.message}</p>
                )}
                <p className="mt-1 text-xs text-secondary-foreground/70">{timeAgo(notif.createdAt)}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {!notif.isRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-secondary-foreground hover:text-emerald-600"
                    title="Mark as read"
                    onClick={() => markRead(notif.id)}
                    aria-label="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-secondary-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete notification"
                  onClick={() => deleteNotification(notif.id)}
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && data && data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-1">
          <p className="text-sm text-secondary-foreground">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm font-medium px-1">{page} / {data.totalPages}</span>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
