"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Committee,
  CreateCommitteeDialog,
  DeleteCommitteeDialog,
  EditCommitteeDialog,
} from "./committee-dialogs";
import { CommitteeDetailsModal } from "./committee-details-modal";

interface PaginatedCommittees {
  items: Committee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "view"; committee: Committee }
  | { type: "edit"; committee: Committee }
  | { type: "delete"; committee: Committee };

export function CommitteeList() {
  const [data, setData] = useState<PaginatedCommittees | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 9;

  // Debounced search
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

  const fetchCommittees = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/committees?${params}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to load committees.");
      }
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchCommittees();
  }, [fetchCommittees]);

  const closeDialog = () => setDialog({ type: "none" });

  return (
    <div className="space-y-6">
      {/* Search & Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
          <Input
            placeholder="Search committees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search committees"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border shrink-0"
            aria-label="Refresh"
            onClick={fetchCommittees}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button className="rounded-full gap-2" onClick={() => setDialog({ type: "create" })}>
            <Plus className="h-4 w-4" /> New Committee
          </Button>
        </div>
      </div>

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchCommittees}>
            Try again
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[140px] animate-pulse rounded-[1.75rem] border border-border bg-secondary/40" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Users className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No committees found</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {debouncedSearch ? "Try a different search query." : "No committees have been created yet."}
          </p>
        </div>
      )}

      {/* Grid of Committees */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((committee) => (
              <CommitteeCard
                key={committee.id}
                committee={committee}
                onView={(c) => setDialog({ type: "view", committee: c })}
                onEdit={(c) => setDialog({ type: "edit", committee: c })}
                onDelete={(c) => setDialog({ type: "delete", committee: c })}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 mt-6">
              <p className="text-sm text-secondary-foreground">
                Showing {(page - 1) * LIMIT + 1}â€“{Math.min(page * LIMIT, data.total)} of {data.total}
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

      {/* Action Dialogs */}
      <CreateCommitteeDialog
        open={dialog.type === "create"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchCommittees}
      />

      <CommitteeDetailsModal
        committee={dialog.type === "view" ? dialog.committee : null}
        open={dialog.type === "view"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      />

      <EditCommitteeDialog
        committee={dialog.type === "edit" ? dialog.committee : null}
        open={dialog.type === "edit"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchCommittees}
      />

      <DeleteCommitteeDialog
        committee={dialog.type === "delete" ? dialog.committee : null}
        open={dialog.type === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchCommittees}
      />
    </div>
  );
}

// â”€â”€ Single Committee Card Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CommitteeCard({
  committee,
  onView,
  onEdit,
  onDelete,
}: {
  committee: Committee;
  onView: (c: Committee) => void;
  onEdit: (c: Committee) => void;
  onDelete: (c: Committee) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="group relative rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.05)] transition-shadow hover:shadow-[0_16px_40px_rgba(77,54,37,0.09)] flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {committee.name[0]?.toUpperCase() ?? "C"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{committee.name}</p>
              <p className="mt-1 text-xs text-secondary-foreground leading-normal line-clamp-2 min-h-[2rem]">
                {committee.description ?? "No description provided."}
              </p>
              <p className="mt-2 text-xs font-medium text-foreground">
                {committee.appointments && committee.appointments.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <span className="font-semibold">Head:</span>{" "}
                    {committee.appointments[0].member.user.name ||
                      committee.appointments[0].member.user.email}
                  </span>
                ) : (
                  <span className="text-secondary-foreground italic">No Head assigned</span>
                )}
              </p>
            </div>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              aria-label="Committee actions"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-40 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_30px_rgba(77,54,37,0.1)]">
                  <button
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                    onClick={() => {
                      setMenuOpen(false);
                      onView(committee);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" /> View Details
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(committee);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(committee);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-secondary-foreground">
        <span>Created {new Date(committee.createdAt).toLocaleDateString()}</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full gap-1" onClick={() => onView(committee)}>
          <Users className="h-3.5 w-3.5" /> Manage
        </Button>
      </div>
    </article>
  );
}
