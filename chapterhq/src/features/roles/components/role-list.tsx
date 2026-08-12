"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Key,
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
import { CreateRoleDialog } from "./create-role-dialog";
import { EditRoleDialog } from "./edit-role-dialog";
import { DeleteRoleDialog } from "./delete-role-dialog";

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
  | { type: "delete"; role: Role };

function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: Role;
  onEdit: (r: Role) => void;
  onDelete: (r: Role) => void;
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
        <span>
          Created {new Date(role.createdAt).toLocaleDateString()}
        </span>
      </div>
    </article>
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
    </div>
  );
}
