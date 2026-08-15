"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Key,
  Layers,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateRoleDialog } from "./create-role-dialog";
import { EditRoleDialog } from "./edit-role-dialog";
import { DeleteRoleDialog } from "./delete-role-dialog";
import { RoleCommitteeAccessDialog } from "./role-committee-access-dialog";

interface Role {
  id: string;
  name: string;
  description: string | null;
  scope: "ORGANIZATION" | "COMMITTEE";
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  _count?: {
    rolePermissions?: number;
    permissions?: number;
    userRoles?: number;
  };
}

interface PaginatedRoles {
  items: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; role: Role }
  | { type: "delete"; role: Role }
  | { type: "assign-members"; role: Role }
  | { type: "committee-access"; role: Role };

function RoleCard({
  role,
  onEdit,
  onDelete,
  onManageMembers,
  onManageCommittees,
}: {
  role: Role;
  onEdit: (r: Role) => void;
  onDelete: (r: Role) => void;
  onManageMembers: (r: Role) => void;
  onManageCommittees: (r: Role) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isPresident = role.name.toLowerCase() === "admin" || role.name.toLowerCase() === "president";

  const permissionCount = role._count?.rolePermissions ?? 0;
  const memberCount = role._count?.userRoles ?? 0;

  return (
    <article className="group relative rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.05)] transition-shadow hover:shadow-[0_16px_40px_rgba(77,54,37,0.09)] flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {role.name[0]?.toUpperCase() ?? "R"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground flex items-center gap-1.5">
                {role.name}
                {isPresident && <Shield className="h-3.5 w-3.5 text-primary shrink-0" />}
              </p>
              <p className="mt-1 text-xs text-secondary-foreground leading-normal line-clamp-2 min-h-[2rem]">
                {role.description ?? "No description provided."}
              </p>
            </div>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              aria-label="Role actions"
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
                      onEdit(role);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                    onClick={() => {
                      setMenuOpen(false);
                      onManageCommittees(role);
                    }}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Committees
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                    onClick={() => {
                      setMenuOpen(false);
                      onManageMembers(role);
                    }}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Add Members
                  </button>
                  {!isPresident && (
                    <button
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(role);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Permission and Member Counts */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl bg-secondary/50 px-2.5 py-1.5 text-secondary-foreground">
            <Key className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{permissionCount} {permissionCount === 1 ? "permission" : "permissions"}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-secondary/50 px-2.5 py-1.5 text-secondary-foreground">
            <Users className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-secondary-foreground">
        <span className="font-medium bg-secondary rounded-full px-2.5 py-0.5">
          {role.scope === "ORGANIZATION" ? "Organization" : "Committee"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-full px-2.5"
            onClick={() => onManageMembers(role)}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Add Members
          </Button>
          <span>
            Created {new Date(role.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </article>
  );
}

function RoleMembersDialog({
  role,
  open,
  onOpenChange,
  onSuccess,
}: {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [members, setMembers] = useState<Array<{ id: string; user: { name: string | null; email: string | null } }>>([]);
  const [assignedMemberIds, setAssignedMemberIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !role) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [assignedRes, membersRes] = await Promise.all([
          fetch(`/api/roles/${role.id}/members`),
          fetch(`/api/members?limit=100`),
        ]);

        if (!assignedRes.ok) {
          const errData = await assignedRes.json().catch(() => ({ message: `HTTP ${assignedRes.status}` }));
          throw new Error(`Failed to load role members: ${errData.message || "Unknown error"}`);
        }

        if (!membersRes.ok) {
          const errData = await membersRes.json().catch(() => ({ message: `HTTP ${membersRes.status}` }));
          throw new Error(`Failed to load members: ${errData.message || "Unknown error"}`);
        }

        const assigned = await assignedRes.json();
        const memberResponse = await membersRes.json();
        const allMembers = memberResponse.items ?? [];
        const assignedIds = new Set<string>((assigned ?? []).map((member: { id: string }) => member.id));

        setMembers(allMembers);
        setAssignedMemberIds(assignedIds);
        setSelectedMemberIds(new Set());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load data.";
        setError(msg);
        console.error("[RoleMembersDialog]", msg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, role]);

  const filteredMembers = members.filter((member) => {
    const haystack = `${member.user.name ?? ""} ${member.user.email ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const assignableIds = filteredMembers
    .filter((member) => !assignedMemberIds.has(member.id))
    .map((member) => member.id);
  const removableIds = filteredMembers
    .filter((member) => assignedMemberIds.has(member.id))
    .map((member) => member.id);

  const toggleSelection = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleAssignSelected = async () => {
    if (!role || selectedMemberIds.size === 0) return;
    const memberIds = [...selectedMemberIds].filter((id) => !assignedMemberIds.has(id));
    if (!memberIds.length) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/roles/${role.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to assign members.");
      }

      const assigned = new Set(assignedMemberIds);
      memberIds.forEach((id) => assigned.add(id));
      setAssignedMemberIds(assigned);
      setSelectedMemberIds(new Set());
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign members.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (!role || selectedMemberIds.size === 0) return;
    const memberIds = [...selectedMemberIds].filter((id) => assignedMemberIds.has(id));
    if (!memberIds.length) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/roles/${role.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to remove members.");
      }

      const assigned = new Set(assignedMemberIds);
      memberIds.forEach((id) => assigned.delete(id));
      setAssignedMemberIds(assigned);
      setSelectedMemberIds(new Set());
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove members.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Members for {role.name}</DialogTitle>
          <DialogDescription>
            Add or remove members for this role without disturbing their other assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4">
          <div className="relative flex-shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members by name or email"
              className="pl-9"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive flex-shrink-0">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-secondary-foreground">
              Loading members...
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between sticky top-0 bg-card">
                  <p className="text-sm font-semibold text-foreground">Assigned members</p>
                  <span className="text-xs text-secondary-foreground">{removableIds.length}</span>
                </div>
                {removableIds.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-4 text-sm text-secondary-foreground">
                    No members currently assigned to this role.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredMembers
                      .filter((member) => assignedMemberIds.has(member.id))
                      .map((member) => (
                        <label
                          key={member.id}
                          className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-secondary/20 px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {member.user.name ?? "Unnamed member"}
                            </span>
                            <span className="block truncate text-xs text-secondary-foreground">
                              {member.user.email ?? "No email"}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.has(member.id)}
                            onChange={() => toggleSelection(member.id)}
                            className="h-4 w-4 accent-primary flex-shrink-0"
                          />
                        </label>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between sticky top-0 bg-card">
                  <p className="text-sm font-semibold text-foreground">Available members</p>
                  <span className="text-xs text-secondary-foreground">{assignableIds.length}</span>
                </div>
                {assignableIds.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-4 text-sm text-secondary-foreground">
                    All members in this organization are already assigned to this role.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredMembers
                      .filter((member) => !assignedMemberIds.has(member.id))
                      .map((member) => (
                        <label
                          key={member.id}
                          className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {member.user.name ?? "Unnamed member"}
                            </span>
                            <span className="block truncate text-xs text-secondary-foreground">
                              {member.user.email ?? "No email"}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.has(member.id)}
                            onChange={() => toggleSelection(member.id)}
                            className="h-4 w-4 accent-primary flex-shrink-0"
                          />
                        </label>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4 flex-shrink-0">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={submitting || selectedMemberIds.size === 0}
            onClick={handleRemoveSelected}
          >
            Remove selected
          </Button>
          <Button
            className="rounded-full"
            disabled={submitting || selectedMemberIds.size === 0}
            onClick={handleAssignSelected}
          >
            {submitting ? "Updating..." : "Assign selected"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RoleList() {
  const [data, setData] = useState<PaginatedRoles | null>(null);
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

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/roles?${params}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to load roles.");
      }
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const closeDialog = () => setDialog({ type: "none" });

  return (
    <div className="space-y-6">
      {/* Search and trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
          <Input
            placeholder="Search roles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search roles"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border shrink-0"
            aria-label="Refresh"
            onClick={fetchRoles}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => (window.location.href = "/roles/permissions")}
          >
            Permission Matrix
          </Button>
          <Button
            className="rounded-full gap-2"
            onClick={() => setDialog({ type: "create" })}
          >
            <Plus className="h-4 w-4" />
            New role
          </Button>
        </div>
      </div>

      {/* Error */}
      {!loading && error && (
        <div className="rounded-2xl bg-destructive/5 border border-border px-5 py-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={fetchRoles}>
            Try again
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[180px] animate-pulse rounded-[1.75rem] border border-border bg-secondary/40"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-card py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Shield className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No roles found</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            {debouncedSearch ? "Try a different search term." : "No custom roles created yet."}
          </p>
        </div>
      )}

      {/* Cards list */}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={(r) => setDialog({ type: "edit", role: r })}
                onDelete={(r) => setDialog({ type: "delete", role: r })}
                onManageMembers={(r) => setDialog({ type: "assign-members", role: r })}
                onManageCommittees={(r) => setDialog({ type: "committee-access", role: r })}
              />
            ))}
          </div>

          {/* Pagination */}
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

      {/* Dialogs */}
      <CreateRoleDialog
        open={dialog.type === "create"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchRoles}
      />
      <EditRoleDialog
        role={dialog.type === "edit" ? dialog.role : null}
        open={dialog.type === "edit"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchRoles}
      />
      <DeleteRoleDialog
        role={dialog.type === "delete" ? dialog.role : null}
        open={dialog.type === "delete"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchRoles}
      />
      <RoleMembersDialog
        role={dialog.type === "assign-members" ? dialog.role : null}
        open={dialog.type === "assign-members"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchRoles}
      />
      <RoleCommitteeAccessDialog
        role={dialog.type === "committee-access" ? dialog.role : null}
        open={dialog.type === "committee-access"}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSuccess={fetchRoles}
      />
    </div>
  );
}
