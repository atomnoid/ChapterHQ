"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Edit2, MoreHorizontal, RefreshCw, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditMemberDialog } from "./edit-member-dialog";
import { DeleteMemberDialog } from "./delete-member-dialog";

// ── Types ────────────────────────────────────────────────────────────────────

type MemberStatus = "ACTIVE" | "PENDING" | "LEFT" | "BLOCKED";

interface Member {
  id: string;
  status: MemberStatus;
  joinedAt: string;
  user: { id: string; name: string | null; email: string | null; image: string | null };
}

interface PaginatedMembers {
  items: Member[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type DialogState =
  | { type: "none" }
  | { type: "edit"; member: Member }
  | { type: "delete"; member: Member };

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<MemberStatus, string> = {
  ACTIVE:  "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100  text-amber-700",
  LEFT:    "bg-secondary  text-secondary-foreground",
  BLOCKED: "bg-destructive/10 text-destructive",
};

function getInitials(name: string | null, email: string | null) {
  if (name) return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

function Avatar({ member }: { member: Member }) {
  if (member.user.image) {
    return (
      <img
        src={member.user.image}
        alt={member.user.name ?? ""}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {getInitials(member.user.name, member.user.email)}
    </span>
  );
}

// ── Row action menu ───────────────────────────────────────────────────────────

function MemberRowMenu({ member, onEdit, onDelete }: { member: Member; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setOpen((v) => !v)} aria-label="Actions">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-40 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_30px_rgba(77,54,37,0.1)]">
            <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => { setOpen(false); onEdit(); }}>
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
            <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
              onClick={() => { setOpen(false); onDelete(); }}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main list component ───────────────────────────────────────────────────────

export function MemberList() {
  const [data, setData] = useState<PaginatedMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 10;

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/members?${params}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to load members.");
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const closeDialog = () => setDialog({ type: "none" });

  return (
    <div className="space-y-5">
      {/* Header + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search members"
          />
        </div>
        <Button variant="outline" size="icon" className="rounded-full border-border shrink-0"
          aria-label="Refresh" onClick={fetchMembers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Error */}
      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchMembers}>Try again</Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="overflow-hidden rounded-[1.75rem] border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0">
              <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 animate-pulse rounded bg-secondary" />
                <div className="h-3 w-48 animate-pulse rounded bg-secondary/60" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-secondary" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Users className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No members found</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {debouncedSearch ? "Try a different search term." : "No members have been added yet."}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[1.75rem] border border-border">
            {/* Head */}
            <div className="hidden grid-cols-[minmax(0,1fr)_160px_140px_52px] items-center gap-4 border-b border-border bg-[#fcf8f1] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground sm:grid">
              <span>Member</span>
              <span>Joined</span>
              <span>Status</span>
              <span />
            </div>

            {/* Rows */}
            {data.items.map((member, idx) => (
              <div
                key={member.id}
                className={`grid grid-cols-[minmax(0,1fr)_52px] items-center gap-3 px-5 py-4 transition-colors hover:bg-[#fcf8f1] sm:grid-cols-[minmax(0,1fr)_160px_140px_52px] ${idx !== data.items.length - 1 ? "border-b border-border" : ""}`}
              >
                {/* Name / email */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar member={member} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {member.user.name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-secondary-foreground">
                      {member.user.email ?? ""}
                    </p>
                  </div>
                </div>

                {/* Joined */}
                <p className="hidden text-sm text-secondary-foreground sm:block">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </p>

                {/* Status badge */}
                <div className="hidden sm:block">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[member.status]}`}>
                    {member.status.charAt(0) + member.status.slice(1).toLowerCase()}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex justify-end">
                  <MemberRowMenu
                    member={member}
                    onEdit={() => setDialog({ type: "edit", member })}
                    onDelete={() => setDialog({ type: "delete", member })}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-secondary-foreground">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"
                  onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-foreground">
                  {page} / {data.totalPages}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <EditMemberDialog
        member={dialog.type === "edit" ? dialog.member : null}
        open={dialog.type === "edit"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        onSuccess={fetchMembers}
      />
      <DeleteMemberDialog
        member={dialog.type === "delete" ? dialog.member : null}
        open={dialog.type === "delete"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        onSuccess={fetchMembers}
      />
    </div>
  );
}
