"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2, Edit2, MoreHorizontal, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateOrganizationDialog } from "./create-organization-dialog";
import { EditOrganizationDialog } from "./edit-organization-dialog";
import { DeleteOrganizationDialog } from "./delete-organization-dialog";

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
}

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; org: Organization }
  | { type: "delete"; org: Organization };

const statusColors: Record<Organization["status"], string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  INACTIVE: "bg-amber-100 text-amber-700",
  SUSPENDED: "bg-destructive/10 text-destructive",
};

function OrganizationCard({
  org,
  isActive,
  onEdit,
  onDelete,
  onSwitch,
}: {
  org: Organization;
  isActive: boolean;
  onEdit: (o: Organization) => void;
  onDelete: (o: Organization) => void;
  onSwitch: (organizationId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="group relative rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_12px_30px_rgba(77,54,37,0.05)] transition-shadow hover:shadow-[0_16px_40px_rgba(77,54,37,0.09)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {org.name[0]?.toUpperCase() ?? "O"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{org.name}</p>
            <p className="mt-0.5 text-xs text-secondary-foreground">/{org.slug}</p>
          </div>
        </div>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Organization actions"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_30px_rgba(77,54,37,0.1)]">
                <button
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary hover:text-foreground"
                  onClick={() => { setMenuOpen(false); onEdit(org); }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                  onClick={() => { setMenuOpen(false); onDelete(org); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Deactivate
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[org.status]}`}
        >
          {org.status.charAt(0) + org.status.slice(1).toLowerCase()}
        </span>
        <span className="text-xs text-secondary-foreground">
          Created {new Date(org.createdAt).toLocaleDateString()}
        </span>
        {!isActive && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto rounded-full"
            onClick={() => onSwitch(org.id)}
          >
            Switch
          </Button>
        )}
      </div>
    </article>
  );
}

export function OrganizationList() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/organizations");
      if (!res.ok) throw new Error("Failed to load organizations.");
      const json = await res.json();
      // GET /api/organizations returns an array of organizations directly
      setOrganizations(Array.isArray(json) ? json : (json.data ?? json.items ?? []));
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const closeDialog = () => setDialog({ type: "none" });

  const switchOrganization = async (organizationId: string) => {
    setError(null);
    try {
      const response = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to switch organizations.");
      }

      await update({ activeOrganizationId: organizationId });
      // Force a complete page reload to flush all client-side contexts, 
      // ensuring the session cookies are fully committed before revalidating.
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to switch organizations.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-secondary-foreground">
            Workspaces
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Your organizations
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-border"
            aria-label="Refresh"
            onClick={fetchOrganizations}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            className="rounded-full gap-2"
            onClick={() => setDialog({ type: "create" })}
          >
            <Plus className="h-4 w-4" />
            New organization
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-[1.75rem] border border-border bg-secondary/40"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-[1.75rem] border border-border bg-destructive/5 px-6 py-5">
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-full"
            onClick={fetchOrganizations}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && organizations.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-border bg-card px-8 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
            <Building2 className="h-6 w-6 text-secondary-foreground" />
          </span>
          <p className="mt-4 text-sm font-semibold text-foreground">No organizations yet</p>
          <p className="mt-1 text-sm text-secondary-foreground">
            Create your first workspace to get started.
          </p>
          <Button
            className="mt-5 rounded-full gap-2"
            onClick={() => setDialog({ type: "create" })}
          >
            <Plus className="h-4 w-4" />
            Create organization
          </Button>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && organizations.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <OrganizationCard
              key={org.id}
              org={org}
              isActive={session?.activeOrganizationId === org.id}
              onEdit={(o) => setDialog({ type: "edit", org: o })}
              onDelete={(o) => setDialog({ type: "delete", org: o })}
              onSwitch={switchOrganization}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateOrganizationDialog
        open={dialog.type === "create"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        onSuccess={fetchOrganizations}
      />
      <EditOrganizationDialog
        organization={dialog.type === "edit" ? dialog.org : null}
        open={dialog.type === "edit"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        onSuccess={fetchOrganizations}
      />
      <DeleteOrganizationDialog
        organization={dialog.type === "delete" ? dialog.org : null}
        open={dialog.type === "delete"}
        onOpenChange={(open) => { if (!open) closeDialog(); }}
        onSuccess={fetchOrganizations}
      />
    </div>
  );
}
