"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit2,
  Eye,
  Filter,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  ShieldAlert,
  Download,
} from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditMemberDialog } from "./edit-member-dialog";
import { DeleteMemberDialog } from "./delete-member-dialog";
import { CreateMemberDialog } from "./create-member-dialog";
import { ViewMemberDialog } from "./view-member-dialog";
import { ManageMemberRolesModal } from "./manage-member-roles-modal";
import { BulkInviteDialog, ManualEmailDialog } from "./member-email-dialogs";

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
  | { type: "create" }
  | { type: "bulk-invite" }
  | { type: "manual-email" }
  | { type: "view"; member: Member }
  | { type: "edit"; member: Member }
  | { type: "delete"; member: Member }
  | { type: "manage-roles"; member: Member };

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<MemberStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  LEFT: "bg-secondary text-secondary-foreground",
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

function MemberRowMenu({
  onView,
  onEdit,
  onDelete,
  onDownload,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div>
      <Button
        ref={btnRef}
        variant="ghost"
        size="icon"
        className="rounded-full h-8 w-8"
        onClick={handleOpen}
        aria-label="Actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />
            <div
              style={menuStyle}
              className="w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_30px_rgba(77,54,37,0.1)]"
            >
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => { setOpen(false); onView(); }}
              >
                <Eye className="h-3.5 w-3.5" /> View
              </button>
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => { setOpen(false); onEdit(); }}
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                onClick={() => { setOpen(false); onDownload(); }}
              >
                <Download className="h-3.5 w-3.5" /> Download Data
              </button>
              <button
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => { setOpen(false); onDelete(); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </>,
          document.body
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
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const LIMIT = 10;

  const handleDownload = async (memberIds?: string[]) => {
    try {
      setDownloading(true);
      const response = await fetch("/api/members/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds }),
      });
      if (!response.ok) throw new Error("Failed to export data");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `member-data-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      alert("Failed to download CSV data.");
    } finally {
      setDownloading(false);
    }
  };

  // Debounce search
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

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/members?${params}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to load members.");
      }
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const closeDialog = () => setDialog({ type: "none" });

  return (
    <div className="space-y-5">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search members"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-secondary-foreground shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-2xl border border-border bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="LEFT">Left</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border shrink-0"
            aria-label="Refresh"
            onClick={fetchMembers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Add Member button */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full shrink-0"
            onClick={() => handleDownload()}
            disabled={downloading}
          >
            <Download className="h-4 w-4 mr-2" /> Export All
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              className="rounded-full shrink-0 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
              onClick={() => handleDownload(Array.from(selectedIds))}
              disabled={downloading}
            >
              <Download className="h-4 w-4 mr-2" /> Export Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-full shrink-0"
            onClick={() => window.location.href = "/forms"}
          >
            <ClipboardList className="h-4 w-4 mr-2" /> Custom Forms
          </Button>
          <Button
            variant="outline"
            className="rounded-full shrink-0"
            onClick={() => setDialog({ type: "manual-email" })}
          >
            <Mail className="h-4 w-4 mr-2" /> Email Members
          </Button>
          <Button
            variant="outline"
            className="rounded-full shrink-0"
            onClick={() => setDialog({ type: "bulk-invite" })}
          >
            <Users className="h-4 w-4 mr-2" /> Bulk Invite
          </Button>
          <Button
            className="rounded-full shrink-0"
            onClick={() => setDialog({ type: "create" })}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Member
          </Button>
        </div>
      </div>

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchMembers}>
            Try again
          </Button>
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

      {/* Empty state */}
      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Users className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No members found</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {debouncedSearch || statusFilter !== "ALL"
              ? "Try adjusting your search or filters."
              : "No members have been added to this organization yet."}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[1.75rem] border border-border">
            {/* Table Head */}
            <div className="hidden grid-cols-[40px_minmax(0,1fr)_160px_140px_52px] items-center gap-4 border-b border-border bg-[#fcf8f1] px-5 py-3 text-xs font-medium uppercase tracking-[0.22em] text-secondary-foreground sm:grid">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                checked={data.items.length > 0 && data.items.every((m) => selectedIds.has(m.id))}
                onChange={(e) => {
                  const newSelected = new Set(selectedIds);
                  if (e.target.checked) {
                    data.items.forEach((m) => newSelected.add(m.id));
                  } else {
                    data.items.forEach((m) => newSelected.delete(m.id));
                  }
                  setSelectedIds(newSelected);
                }}
              />
              <span>Member</span>
              <span>Joined</span>
              <span>Status</span>
              <span />
            </div>

            {/* Table Rows */}
            {data.items.map((member, idx) => {
              const isSelected = selectedIds.has(member.id);
              return (
                <div
                  key={member.id}
                  className={`grid grid-cols-[40px_minmax(0,1fr)_52px] items-center gap-3 px-5 py-4 transition-colors hover:bg-[#fcf8f1] sm:grid-cols-[40px_minmax(0,1fr)_160px_140px_52px] ${
                    idx !== data.items.length - 1 ? "border-b border-border" : ""
                  } ${isSelected ? "bg-primary/5" : ""}`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    checked={isSelected}
                    onChange={(e) => {
                      const newSelected = new Set(selectedIds);
                      if (e.target.checked) {
                        newSelected.add(member.id);
                      } else {
                        newSelected.delete(member.id);
                      }
                      setSelectedIds(newSelected);
                    }}
                  />

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
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[member.status]
                      }`}
                    >
                      {member.status.charAt(0) + member.status.slice(1).toLowerCase()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <MemberRowMenu
                      onView={() => setDialog({ type: "view", member })}
                      onEdit={() => setDialog({ type: "edit", member })}
                      onDelete={() => setDialog({ type: "delete", member })}
                      onDownload={() => handleDownload([member.id])}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
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
      <CreateMemberDialog
        open={dialog.type === "create"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchMembers}
      />
      <BulkInviteDialog
        open={dialog.type === "bulk-invite"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchMembers}
      />
      <ManualEmailDialog
        open={dialog.type === "manual-email"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      />
      <ViewMemberDialog
        member={dialog.type === "view" ? dialog.member : null}
        open={dialog.type === "view"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onManageRoles={(member) => {
          closeDialog();
          setDialog({ type: "manage-roles", member });
        }}
      />
      <EditMemberDialog
        member={dialog.type === "edit" ? dialog.member : null}
        open={dialog.type === "edit"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchMembers}
      />
      <DeleteMemberDialog
        member={dialog.type === "delete" ? dialog.member : null}
        open={dialog.type === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchMembers}
      />
      <ManageMemberRolesModal
        member={dialog.type === "manage-roles" ? dialog.member : null}
        open={dialog.type === "manage-roles"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchMembers}
      />
    </div>
  );
}
