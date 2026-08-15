"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogActor {
  id: string;
  name: string | null;
  email: string | null;
}

interface AuditLogTarget {
  id: string | null;
  name: string | null;
}

interface AuditLogItem {
  id: string;
  actor: AuditLogActor;
  action: string;
  resource: string;
  target: AuditLogTarget;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

interface AuditLogsResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: AuditLogItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

function actionColor(action: string) {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("remove") || a.includes("revoke"))
    return "bg-destructive/10 text-destructive border-destructive/20";
  if (a.includes("create") || a.includes("add") || a.includes("register"))
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (a.includes("update") || a.includes("edit") || a.includes("change"))
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (a.includes("login") || a.includes("logout") || a.includes("auth"))
    return "bg-primary/10 text-primary border-primary/20";
  return "bg-secondary text-secondary-foreground border-border";
}

function resourceLabel(resource: string) {
  return resource.replace(/-/g, " ").replace(/_/g, " ");
}

function getInitials(name: string | null, email: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  }
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterInput({
  id,
  value,
  onChange,
  placeholder,
  icon: Icon,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: typeof Search;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary-foreground" />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-secondary-foreground hover:text-foreground"
          aria-label="Clear filter"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 rounded-2xl border border-border bg-background p-4">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-secondary/40" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded-xl bg-secondary/40" />
            <div className="h-3 w-2/3 animate-pulse rounded-xl bg-secondary/40" />
          </div>
          <div className="h-5 w-20 shrink-0 animate-pulse rounded-full bg-secondary/40" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-background px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Clock className="h-5 w-5 text-secondary-foreground" />
      </span>
      <p className="mt-4 text-sm font-semibold text-foreground">
        {hasFilters ? "No matching audit logs" : "No audit activity yet"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-secondary-foreground">
        {hasFilters
          ? "Try clearing your filters to see all audit logs."
          : "Actions performed in your organization will be recorded here."}
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-destructive/20 bg-destructive/5 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </span>
      <p className="mt-4 text-sm font-semibold text-foreground">Failed to load audit logs</p>
      <p className="mt-1 text-sm text-secondary-foreground">There was a problem fetching the data.</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-5 rounded-xl"
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

function formatMetadata(metadata: Record<string, unknown> | null, memberMap: Map<string, string>) {
  if (!metadata || Object.keys(metadata).length === 0) return null;
  
  return Object.entries(metadata)
    .map(([key, val]) => {
      if (key === "memberId" && typeof val === "string") {
        const name = memberMap.get(val);
        if (name) return `member: ${name}`;
      }
      let formattedVal = "";
      if (val && typeof val === "object") {
        formattedVal = JSON.stringify(val);
      } else {
        formattedVal = String(val);
      }
      return `${key}: ${formattedVal}`;
    })
    .join(", ");
}

function AuditLogRow({ log, memberMap }: { log: AuditLogItem; memberMap: Map<string, string> }) {
  const { date, time } = formatDateTime(log.timestamp);
  const actorLabel = log.actor.name || log.actor.email || "System";
  const initials = getInitials(log.actor.name, log.actor.email);

  return (
    <div className="flex items-start gap-3 sm:gap-4 rounded-2xl border border-border bg-background p-3.5 sm:p-4 transition-colors hover:bg-secondary/30">
      {/* Actor avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="max-w-[160px] truncate text-sm font-semibold text-foreground">
            {actorLabel}
          </span>
          {log.actor.email && log.actor.name && (
            <span className="hidden max-w-[180px] truncate text-xs text-secondary-foreground sm:inline">
              {log.actor.email}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-sm leading-snug text-secondary-foreground">
          Performed{" "}
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none",
              actionColor(log.action)
            )}
          >
            {log.action}
          </span>{" "}
          on{" "}
          <span className="font-medium capitalize text-foreground">
            {resourceLabel(log.resource)}
          </span>
          {log.target.name && (
            <>
              {" "}
              &middot;{" "}
              <span className="italic">
                &ldquo;{log.target.name}&rdquo;
              </span>
            </>
          )}
        </p>

        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <p className="mt-1 truncate font-mono text-[11px] text-secondary-foreground">
            {formatMetadata(log.metadata, memberMap)}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <div className="shrink-0 text-right">
        <p className="text-xs font-medium text-foreground">{date}</p>
        <p className="mt-0.5 text-[11px] text-secondary-foreground">{time}</p>
      </div>
    </div>
  );
}

function AuditPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-xs text-secondary-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{start}-{end}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> entries
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 tabular-nums text-sm text-foreground">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-xl"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const LIMIT = 20;

export function AuditLogList() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [memberMap, setMemberMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/members?limit=1000");
        if (res.ok) {
          const json = await res.json();
          const items = json?.items ?? [];
          const map = new Map<string, string>();
          items.forEach((m: any) => {
            if (m.id && m.user) {
              map.set(m.id, m.user.name || m.user.email || "Unknown");
            }
          });
          setMemberMap(map);
        }
      } catch (err) {
        console.error("Failed to fetch members for audit log resolution", err);
      }
    };
    fetchMembers();
  }, []);

  // Filter state
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");

  // Debounced values
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedAction, setDebouncedAction] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAction(action), 350);
    return () => clearTimeout(t);
  }, [action]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedAction]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        order: "desc",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (debouncedAction) params.set("action", debouncedAction);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      // API wraps in { data: { ... } } envelope or returns directly
      const result: AuditLogsResponse = json?.data ?? json;
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, debouncedAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const hasFilters = !!(debouncedSearch || debouncedAction);

  const clearFilters = () => {
    setSearch("");
    setAction("");
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* ── Filters bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <FilterInput
            id="audit-search"
            value={search}
            onChange={setSearch}
            placeholder="Search by actor or target..."
            icon={Search}
          />
        </div>
        <div className="flex gap-2">
          <div className="min-w-[130px] flex-1 sm:flex-none">
            <FilterInput
              id="audit-action-filter"
              value={action}
              onChange={setAction}
              placeholder="Action..."
              icon={Filter}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-xl text-xs"
              onClick={clearFilters}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-xl"
            onClick={fetchLogs}
            aria-label="Refresh audit logs"
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* ── Result count ── */}
      {!loading && !error && data && (
        <p className="text-xs text-secondary-foreground">
          {data.total === 0 ? (
            "No results"
          ) : (
            <>
              <span className="font-medium text-foreground">{data.total}</span>{" "}
              audit log{data.total !== 1 ? "s" : ""}
              {hasFilters ? " matching filters" : ""}
            </>
          )}
        </p>
      )}

      {/* â”€â”€ Content â”€â”€ */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState onRetry={fetchLogs} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="space-y-2">
          {data.items.map((log) => (
            <AuditLogRow key={log.id} log={log} memberMap={memberMap} />
          ))}
        </div>
      )}

      {/* â”€â”€ Pagination â”€â”€ */}
      {!loading && !error && data && data.totalPages > 1 && (
        <AuditPagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          limit={data.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
