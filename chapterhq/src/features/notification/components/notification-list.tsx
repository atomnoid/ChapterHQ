"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface AppNotification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  targetScope: string;
  isRead: boolean;
  createdAt: string;
  targetCommitteeId?: string | null;
}

interface PaginatedNotifications {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const NOTIFICATION_TYPES = ["INFO", "SUCCESS", "WARNING", "ERROR", "ANNOUNCEMENT", "SYSTEM"] as const;
type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const TYPE_COLORS: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUCCESS: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  WARNING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ERROR: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ANNOUNCEMENT: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  SYSTEM: "bg-secondary text-secondary-foreground",
};

const TYPE_DOT_COLORS: Record<string, string> = {
  INFO: "bg-blue-500",
  SUCCESS: "bg-emerald-500",
  WARNING: "bg-amber-500",
  ERROR: "bg-red-500",
  ANNOUNCEMENT: "bg-purple-500",
  SYSTEM: "bg-secondary-foreground",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Create Notification Dialog ──────────────────────────────────────────────

interface CreateNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
interface RecipientMember { id: string; user: { name: string | null; email: string }; }
interface AudienceCommittee { id: string; name: string; }

function CreateNotificationDialog({ open, onOpenChange, onSuccess }: CreateNotificationDialogProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("INFO");
  const [targetScope, setTargetScope] = useState<"ORGANIZATION" | "COMMITTEE" | "MEMBERS">("ORGANIZATION");
  const [canTargetOrganization, setCanTargetOrganization] = useState<boolean | null>(null);
  const [members, setMembers] = useState<RecipientMember[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [committees, setCommittees] = useState<AudienceCommittee[]>([]);
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setMessage("");
      setType("INFO");
      setMemberIds([]);
      setMemberSearch("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/me/permissions").then(async (res) => {
      const payload = await res.json();
      const isAdmin = Boolean(payload?.notificationAudience?.isOrganizationAdministrator);
      setCanTargetOrganization(isAdmin);
      setTargetScope(isAdmin ? "ORGANIZATION" : "COMMITTEE");
      const activeCommitteeId = payload?.notificationAudience?.activeCommitteeId ?? null;
      setSelectedCommitteeId(activeCommitteeId);
      if (isAdmin) {
        const committeesRes = await fetch("/api/committees?page=1&limit=100&order=asc");
        const committeesPayload = await committeesRes.json();
        if (!committeesRes.ok) throw new Error(committeesPayload.message ?? "Failed to load committees.");
        const items = committeesPayload?.data?.items ?? committeesPayload?.items ?? [];
        setCommittees(items);
        setSelectedCommitteeId((current: string | null) => current ?? items[0]?.id ?? null);
      }
    }).catch(() => setCanTargetOrganization(false));
  }, [open]);

  useEffect(() => {
    if (!open || targetScope !== "MEMBERS") return;
    const controller = new AbortController();
    setMembersLoading(true); setMembersError(null);
    const timer = setTimeout(async () => {
      try {
        if (!selectedCommitteeId) throw new Error("Select a committee first.");
        const res = await fetch(`/api/notifications/members?committeeId=${encodeURIComponent(selectedCommitteeId)}&search=${encodeURIComponent(memberSearch)}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Failed to load members.");
        setMembers(json?.data?.items ?? json?.items ?? []);
      } catch (e) { if (!controller.signal.aborted) setMembersError(e instanceof Error ? e.message : "Failed to load members."); }
      finally { if (!controller.signal.aborted) setMembersLoading(false); }
    }, 200);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [open, targetScope, memberSearch, selectedCommitteeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required.");
      return;
    }
    if (targetScope === "MEMBERS" && memberIds.length === 0) {
      setError("Select at least one member.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), type, targetType: targetScope === "ORGANIZATION" ? "ORGANIZATION" : "COMMITTEE", ...(targetScope !== "ORGANIZATION" ? { committeeId: selectedCommitteeId } : {}), recipientMode: targetScope === "MEMBERS" ? "SPECIFIC_MEMBERS" : "ALL", ...(targetScope === "MEMBERS" ? { recipientIds: memberIds } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "Failed to send notification.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Send Notification</DialogTitle>
          </div>
          <DialogDescription>
            Broadcast a notification to your organization or current committee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-title">Title</Label>
            <input
              id="notif-title"
              type="text"
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="e.g. Meeting Rescheduled"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-message">Message</Label>
            <textarea
              id="notif-message"
              rows={4}
              className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder="Write your notification message here…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              required
            />
            <p className="text-xs text-secondary-foreground text-right">{message.length}/2000</p>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-type">Type</Label>
            <select
              id="notif-type"
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={type}
              onChange={(e) => setType(e.target.value as NotificationType)}
            >
              {NOTIFICATION_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          {/* Scope */}
          <div className="space-y-1.5">
            <Label>Target Audience</Label>
            <div className="flex gap-2">
              {(canTargetOrganization ? ["ORGANIZATION", "COMMITTEE", "MEMBERS"] : ["COMMITTEE", "MEMBERS"]).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setTargetScope(scope as typeof targetScope)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    targetScope === scope
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-secondary-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {targetScope === scope ? "● " : "○ "}{scope === "MEMBERS" ? "Selected Members" : ""}
                  {scope === "ORGANIZATION" ? "🏢 Organization" : "👥 Committee"}
                </button>
              ))}
            </div>
            <p className="text-xs text-secondary-foreground">
              {targetScope === "COMMITTEE"
                ? "Sent to members of your currently active committee."
                : "Sent to all members of this organization."}
            </p>
          </div>

          {targetScope !== "ORGANIZATION" && (
            <div className="space-y-1.5">
              <Label>Select Committee</Label>
              {canTargetOrganization ? (
                <select className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" value={selectedCommitteeId ?? ""} onChange={(e) => { setSelectedCommitteeId(e.target.value || null); setMemberIds([]); }}>
                  <option value="">Select a committee</option>
                  {committees.map((committee) => <option key={committee.id} value={committee.id}>{committee.name}</option>)}
                </select>
              ) : (
                <div className="flex h-10 items-center rounded-xl border border-border bg-secondary/40 px-3 text-sm">My active committee 🔒</div>
              )}
            </div>
          )}

          {targetScope === "MEMBERS" && <div className="space-y-2 rounded-xl border border-border p-3">
            <input className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Search members..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
            <div className="flex gap-2 text-xs"><button type="button" className="underline" onClick={() => setMemberIds(members.map((member) => member.id))}>Select All</button><button type="button" className="underline" onClick={() => setMemberIds([])}>Clear All</button><span>{memberIds.length} selected</span></div>
            {membersLoading && <p className="text-sm text-secondary-foreground">Loading members…</p>}{membersError && <p className="text-sm text-destructive">{membersError}</p>}
            {!membersLoading && !membersError && members.length === 0 && <p className="text-sm text-secondary-foreground">No matching active members.</p>}
            <div className="max-h-44 space-y-1 overflow-y-auto">{members.map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-secondary"><input type="checkbox" checked={memberIds.includes(member.id)} onChange={() => setMemberIds((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])} />{member.user.name ?? member.user.email}</label>)}</div>
          </div>}

          {error && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl gap-2"
              disabled={submitting || !title.trim() || !message.trim() || canTargetOrganization === null || (targetScope !== "ORGANIZATION" && !selectedCommitteeId) || (targetScope === "MEMBERS" && memberIds.length === 0)}
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Notification List ────────────────────────────────────────────────────────

export function NotificationList() {
  const [data, setData] = useState<PaginatedNotifications | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [page, setPage] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { data: session } = useSession();
  const activeCommitteeId = session?.activeCommitteeId ?? null;
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
    } finally {
      setLoading(false);
    }
  }, [page, filter, activeCommitteeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <>
      <CreateNotificationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => { setFilter("ALL"); setPage(1); fetchData(); }}
      />

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
                {f === "UNREAD" && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
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
            <Button
              size="sm"
              className="rounded-full gap-2 shrink-0"
              onClick={() => setCreateOpen(true)}
              id="create-notification-btn"
            >
              <Plus className="h-4 w-4" />
              Send notification
            </Button>
          </div>
        </div>

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchData}>Try again</Button>
          </div>
        )}

        {/* Loading skeleton */}
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

        {/* Empty state */}
        {!loading && !error && data?.items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <BellOff className="h-6 w-6 text-secondary-foreground" />
            </span>
            <p className="mt-4 text-sm font-semibold text-foreground">No notifications</p>
            <p className="mt-1 text-sm text-secondary-foreground">
              {filter !== "ALL" ? "No notifications match this filter." : "You're all caught up!"}
            </p>
            <Button
              size="sm"
              className="mt-5 rounded-full gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Send first notification
            </Button>
          </div>
        )}

        {/* Notification items */}
        {!loading && !error && data && data.items.length > 0 && (
          <div className="space-y-2">
            {data.items.map((notif) => {
              const dotColor = TYPE_DOT_COLORS[notif.type] ?? "bg-secondary-foreground";
              const badgeColor = TYPE_COLORS[notif.type] ?? "bg-secondary text-secondary-foreground";
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 rounded-[1.25rem] border px-5 py-4 transition-all ${
                    notif.isRead
                      ? "border-border bg-card"
                      : "border-primary/20 bg-primary/[0.03] shadow-sm"
                  }`}
                >
                  {/* Icon dot */}
                  <span
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5 ${
                      notif.isRead ? "bg-secondary" : "bg-primary/10"
                    }`}
                  >
                    <Bell className={`h-4 w-4 ${notif.isRead ? "text-secondary-foreground" : "text-primary"}`} />
                    {!notif.isRead && (
                      <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${dotColor}`} />
                    )}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <p className={`text-sm font-semibold leading-snug ${notif.isRead ? "text-foreground" : "text-foreground"}`}>
                        {notif.title}
                        {!notif.isRead && (
                          <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                        )}
                      </p>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${badgeColor}`}>
                        {notif.type}
                      </span>
                    </div>
                    {notif.message && (
                      <p className="mt-0.5 text-sm text-secondary-foreground line-clamp-2">{notif.message}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <p className="text-xs text-secondary-foreground/60">{timeAgo(notif.createdAt)}</p>
                      {notif.targetScope && (
                        <span className="text-xs text-secondary-foreground/40">·</span>
                      )}
                      {notif.targetScope && (
                        <span className="text-xs text-secondary-foreground/50 capitalize">
                          {notif.targetScope === "COMMITTEE" ? "Committee" : "Organization"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1 ml-1">
                    {!notif.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-secondary-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
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
                      title="Delete"
                      onClick={() => deleteNotification(notif.id)}
                      aria-label="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
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
    </>
  );
}
