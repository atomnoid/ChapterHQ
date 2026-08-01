"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  MoreHorizontal,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Eye,
  MapPin,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type Event,
  type EventStatus,
  CreateEventDialog,
  EditEventDialog,
  DeleteEventDialog,
} from "./event-dialogs";

interface PaginatedEvents {
  items: Event[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; event: Event }
  | { type: "delete"; event: Event };

const STATUS_STYLES: Record<EventStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-destructive/10 text-destructive",
};

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventRowMenu({
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onView,
}: {
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full h-8 w-8"
        onClick={() => setOpen((v) => !v)}
        aria-label="Event actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-40 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_30px_rgba(77,54,37,0.1)]">
            <button
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => {
                setOpen(false);
                onView();
              }}
            >
              <Eye className="h-3.5 w-3.5" /> View Details
            </button>
            {canEdit && (
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {canDelete && (
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
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

interface EventListProps {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function EventList({
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: EventListProps) {
  const [data, setData] = useState<PaginatedEvents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 10;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to load events.");
      }
      const json = await res.json();
      setData(json?.data ?? json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const closeDialog = () => setDialog({ type: "none" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search events"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-secondary-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-2xl border border-border bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter status"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border shrink-0"
            aria-label="Refresh"
            onClick={fetchEvents}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {canCreate && (
          <Button className="rounded-full shrink-0" onClick={() => setDialog({ type: "create" })}>
            <Plus className="h-4 w-4 mr-2" /> New Event
          </Button>
        )}
      </div>

      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchEvents}>
            Try again
          </Button>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-border rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="h-5 w-2/3 bg-secondary rounded" />
              <div className="h-3.5 w-1/2 bg-secondary/80 rounded" />
              <div className="h-3 w-1/3 bg-secondary/60 rounded" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 w-16 bg-secondary rounded-full" />
                <div className="h-8 w-8 bg-secondary rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Calendar className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No events found</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {debouncedSearch || statusFilter !== "ALL"
              ? "Try adjusting your search or filters."
              : "No events are scheduled yet."}
          </p>
          {canCreate && (
            <Button className="mt-5 rounded-full" onClick={() => setDialog({ type: "create" })}>
              <Plus className="h-4 w-4 mr-2" /> Create First Event
            </Button>
          )}
        </div>
      )}

      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((event) => (
              <div
                key={event.id}
                className="flex flex-col justify-between border border-border bg-card rounded-2xl p-5 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-foreground line-clamp-1">
                      {event.title}
                    </h3>
                    <EventRowMenu
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={() => setDialog({ type: "edit", event })}
                      onDelete={() => setDialog({ type: "delete", event })}
                      onView={() => window.location.assign(`/dashboard/events/${event.id}`)}
                    />
                  </div>
                  <p className="text-xs text-secondary-foreground line-clamp-2 mt-1.5 min-h-[2rem]">
                    {event.description ?? "No description provided."}
                  </p>
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-secondary-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatEventDate(event.startDate)}</span>
                    </div>
                    {event.venue && (
                      <div className="flex items-center gap-2 text-xs text-secondary-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">{event.venue}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-border">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[event.status]
                    }`}
                  >
                    {STATUS_LABELS[event.status]}
                  </span>
                  <Link href={`/dashboard/events/${event.id}`}>
                    <Button variant="ghost" size="sm" className="rounded-full text-xs gap-1.5 h-8">
                      Manage <Eye className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 mt-6">
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

      <CreateEventDialog
        open={dialog.type === "create"}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={fetchEvents}
      />
      <EditEventDialog
        event={dialog.type === "edit" ? dialog.event : null}
        open={dialog.type === "edit"}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={fetchEvents}
      />
      <DeleteEventDialog
        event={dialog.type === "delete" ? dialog.event : null}
        open={dialog.type === "delete"}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={fetchEvents}
      />
    </div>
  );
}
