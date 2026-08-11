"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type Appointment,
  type AppointmentStatus,
  CreateAppointmentDialog,
  EditAppointmentDialog,
  DeleteAppointmentDialog,
} from "./appointment-dialogs";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaginatedAppointments {
  items: Appointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; appointment: Appointment }
  | { type: "delete"; appointment: Appointment };

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-amber-100 text-amber-700",
  REVOKED: "bg-destructive/10 text-destructive",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  REVOKED: "Revoked",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string | null, email: string | null): string {
  if (name) return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

// ── Row action menu ───────────────────────────────────────────────────────────

function AppointmentRowMenu({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!canEdit && !canDelete) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-8 w-8"
        onClick={() => setOpen((v) => !v)}
        aria-label="Appointment actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-40 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_30px_rgba(77,54,37,0.1)]">
            {canEdit && (
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => { setOpen(false); onEdit(); }}
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {canDelete && (
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => { setOpen(false); onDelete(); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AppointmentListProps {
  /** If true the user has appointments:create permission */
  canCreate?: boolean;
  /** If true the user has appointments:update permission */
  canEdit?: boolean;
  /** If true the user has appointments:delete permission */
  canDelete?: boolean;
}

export function AppointmentList({
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: AppointmentListProps) {
  const [data, setData] = useState<PaginatedAppointments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session } = useSession();
  const activeCommitteeId = session?.activeCommitteeId ?? null;
  const LIMIT = 10;

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/appointments?${params}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to load appointments.");
      }
      const json = await res.json();
      // Handle both { data: { items, ... } } and { items, ... } shapes
      setData(json?.data ?? json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, activeCommitteeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const closeDialog = () => setDialog({ type: "none" });

  const handleSuccess = useCallback(() => {
    setPage(1);
    fetchAppointments();
  }, [fetchAppointments]);

  return (
    <div className="space-y-5">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input
              placeholder="Search by designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search appointments"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-secondary-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="h-10 rounded-2xl border border-border bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border shrink-0"
            aria-label="Refresh"
            onClick={fetchAppointments}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Create button — only shown when permitted */}
        {canCreate && (
          <Button
            className="rounded-full shrink-0"
            onClick={() => setDialog({ type: "create" })}
          >
            <Plus className="h-4 w-4 mr-2" /> New Appointment
          </Button>
        )}
      </div>

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchAppointments}>
            Try again
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="overflow-hidden rounded-[1.75rem] border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
              <div className="h-9 w-9 animate-pulse rounded-full bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 animate-pulse rounded bg-secondary" />
                <div className="h-3 w-24 animate-pulse rounded bg-secondary/60" />
              </div>
              <div className="hidden sm:flex gap-2 items-center">
                <div className="h-6 w-20 animate-pulse rounded-full bg-secondary" />
                <div className="h-4 w-24 animate-pulse rounded bg-secondary/60" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <CalendarDays className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No appointments found</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {debouncedSearch || statusFilter !== "ALL"
              ? "Try adjusting your search or filters."
              : "No appointments have been created yet."}
          </p>
          {canCreate && (
            <Button
              className="mt-5 rounded-full"
              onClick={() => setDialog({ type: "create" })}
            >
              <Plus className="h-4 w-4 mr-2" /> New Appointment
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[1.75rem] border border-border">
            {/* Table head */}
            <div className="hidden grid-cols-[minmax(0,1fr)_160px_160px_120px_100px_52px] items-center gap-4 border-b border-border bg-[#fcf8f1] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground lg:grid">
              <span>Member</span>
              <span>Committee</span>
              <span>Designation</span>
              <span>Dates</span>
              <span>Status</span>
              <span />
            </div>

            {/* Table rows */}
            {data.items.map((apt, idx) => {
              const memberName = apt.member.user.name ?? apt.member.user.email ?? "Unknown";
              const initials = getInitials(apt.member.user.name, apt.member.user.email);

              return (
                <div
                  key={apt.id}
                  className={`grid grid-cols-[minmax(0,1fr)_52px] items-center gap-3 px-5 py-4 transition-colors hover:bg-[#fcf8f1] lg:grid-cols-[minmax(0,1fr)_160px_160px_120px_100px_52px] ${
                    idx !== data.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  {/* Member */}
                  <div className="flex items-center gap-3 min-w-0">
                    {apt.member.user.image ? (
                      <img
                        src={apt.member.user.image}
                        alt={memberName}
                        className="h-9 w-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {initials}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{memberName}</p>
                      <p className="truncate text-xs text-secondary-foreground">
                        {apt.member.user.email ?? ""}
                      </p>
                    </div>
                  </div>

                  {/* Committee */}
                  <p className="hidden truncate text-sm text-secondary-foreground lg:block">
                    {apt.committee.name}
                  </p>

                  {/* Designation */}
                  <p className="hidden truncate text-sm font-medium text-foreground lg:block">
                    {apt.designation}
                  </p>

                  {/* Dates */}
                  <div className="hidden lg:block">
                    <p className="text-xs text-foreground">{formatDate(apt.startDate)}</p>
                    {apt.endDate && (
                      <p className="text-xs text-secondary-foreground">→ {formatDate(apt.endDate)}</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="hidden lg:block">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[apt.status]
                      }`}
                    >
                      {STATUS_LABELS[apt.status]}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <AppointmentRowMenu
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={() => setDialog({ type: "edit", appointment: apt })}
                      onDelete={() => setDialog({ type: "delete", appointment: apt })}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-secondary-foreground">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-foreground">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <CreateAppointmentDialog
        open={dialog.type === "create"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        onSuccess={handleSuccess}
      />
      <EditAppointmentDialog
        appointment={dialog.type === "edit" ? dialog.appointment : null}
        open={dialog.type === "edit"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        onSuccess={handleSuccess}
      />
      <DeleteAppointmentDialog
        appointment={dialog.type === "delete" ? dialog.appointment : null}
        open={dialog.type === "delete"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
