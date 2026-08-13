"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Role {
  id: string;
  name: string;
  description: string | null;
  scope: "ORGANIZATION" | "COMMITTEE";
  status: "ACTIVE" | "INACTIVE";
}

interface Member {
  id: string;
  user: { id: string; name: string | null; email: string | null };
}

interface ManageMemberRolesModalProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ManageMemberRolesModal({
  member,
  open,
  onOpenChange,
  onSuccess,
}: ManageMemberRolesModalProps) {
  const [assignedRoles, setAssignedRoles] = useState<Role[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load assigned and available roles
  useEffect(() => {
    if (!member || !open) return;

    const loadRoles = async () => {
      setLoading(true);
      setServerError(null);
      try {
        // Get assigned roles
        const rolesRes = await fetch(`/api/members/${member.id}/roles`);
        if (!rolesRes.ok) throw new Error("Failed to load assigned roles");
        const roles = await rolesRes.json();
        setAssignedRoles(roles);

        // Get available roles (all active roles minus already assigned)
        const allRolesRes = await fetch("/api/roles?limit=100");
        if (!allRolesRes.ok) throw new Error("Failed to load roles");
        const allRolesData = await allRolesRes.json();
        const allRoles = allRolesData.items || [];

        const assignedIds = new Set(roles.map((r: Role) => r.id));
        const available = allRoles.filter((r: Role) => !assignedIds.has(r.id));
        setAvailableRoles(available);
        setSelectedRoleId("");
      } catch (error) {
        setServerError(
          error instanceof Error ? error.message : "Failed to load roles"
        );
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, [member, open]);

  const handleAssignRole = async () => {
    if (!member || !selectedRoleId) return;

    setAssigning(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/members/${member.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selectedRoleId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to assign role");
      }

      setSuccessMessage("Role assigned successfully");

      // Reload roles
      const rolesRes = await fetch(`/api/members/${member.id}/roles`);
      if (rolesRes.ok) {
        const roles = await rolesRes.json();
        setAssignedRoles(roles);

        // Update available roles
        const allRolesRes = await fetch("/api/roles?limit=100");
        if (allRolesRes.ok) {
          const allRolesData = await allRolesRes.json();
          const allRoles = allRolesData.items || [];
          const assignedIds = new Set(roles.map((r: Role) => r.id));
          const available = allRoles.filter((r: Role) => !assignedIds.has(r.id));
          setAvailableRoles(available);
          setSelectedRoleId("");
        }
      }

      onSuccess?.();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Failed to assign role"
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!member) return;

    setRemoving(roleId);
    setServerError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/members/${member.id}/roles/${roleId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to remove role");
      }

      setSuccessMessage("Role removed successfully");

      // Reload roles
      const rolesRes = await fetch(`/api/members/${member.id}/roles`);
      if (rolesRes.ok) {
        const roles = await rolesRes.json();
        setAssignedRoles(roles);

        // Update available roles
        const allRolesRes = await fetch("/api/roles?limit=100");
        if (allRolesRes.ok) {
          const allRolesData = await allRolesRes.json();
          const allRoles = allRolesData.items || [];
          const assignedIds = new Set(roles.map((r: Role) => r.id));
          const available = allRoles.filter((r: Role) => !assignedIds.has(r.id));
          setAvailableRoles(available);
        }
      }

      onSuccess?.();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Failed to remove role"
      );
    } finally {
      setRemoving(null);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Assign or remove roles for {member.user.name || member.user.email}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Error Message */}
            {serverError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">{serverError}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm text-emerald-700">{successMessage}</p>
              </div>
            )}

            {/* Assigned Roles Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-sm">
                Assigned Roles ({assignedRoles.length})
              </h3>
              {assignedRoles.length === 0 ? (
                <p className="text-sm text-secondary-foreground">
                  No roles currently assigned.
                </p>
              ) : (
                <div className="space-y-2">
                  {assignedRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/40"
                    >
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {role.name}
                        </p>
                        {role.description && (
                          <p className="text-xs text-secondary-foreground mt-0.5">
                            {role.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRole(role.id)}
                        disabled={removing === role.id}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        {removing === role.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Role Section */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="font-semibold text-foreground text-sm">Add Role</h3>
              {availableRoles.length === 0 ? (
                <p className="text-sm text-secondary-foreground">
                  All available roles have been assigned to this member.
                </p>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="role-select" className="sr-only">
                      Select a role to assign
                    </Label>
                    <select
                      id="role-select"
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select a role to assign...</option>
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                          {role.description ? ` • ${role.description}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    onClick={handleAssignRole}
                    disabled={!selectedRoleId || assigning}
                    className="gap-2"
                  >
                    {assigning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Assign
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
