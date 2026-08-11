"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Save, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

interface Role {
  id: string;
  name: string;
}

// Custom simple checkbox component to match ChapterHQ's premium style
function Checkbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-primary/50"
      }`}
    >
      {checked && <Check className="h-3.5 w-3.5 stroke-[3px]" />}
    </button>
  );
}

export function PermissionMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 1. Fetch roles & permissions list
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [rolesRes, permsRes] = await Promise.all([
          fetch("/api/roles?limit=100"),
          fetch("/api/permissions"),
        ]);

        if (!rolesRes.ok || !permsRes.ok) {
          throw new Error("Failed to load initial data.");
        }

        const rolesJson = await rolesRes.json();
        const permsJson = await permsRes.json();

        const rolesList = rolesJson.items ?? [];
        setRoles(rolesList);
        setPermissionGroups(permsJson);

        if (rolesList.length > 0) {
          setSelectedRoleId(rolesList[0].id);
        }
      } catch (err: any) {
        setError(err.message ?? "An error occurred while loading settings.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Fetch specific role permissions on role change
  useEffect(() => {
    if (!selectedRoleId) return;

    async function loadRolePermissions() {
      setError(null);
      setSaveSuccess(false);
      try {
        const res = await fetch(`/api/roles/${selectedRoleId}/permissions`);
        if (!res.ok) throw new Error("Failed to load permissions for the selected role.");
        const mappings = await res.json();
        // mappings is array of { roleId, permissionId, permission: { id, resource, action } }
        const activeIds = mappings.map((m: any) => m.permissionId ?? m.permission?.id);
        setSelectedPermissionIds(new Set(activeIds));
      } catch (err: any) {
        setError(err.message);
      }
    }

    loadRolePermissions();
  }, [selectedRoleId]);

  // Toggle single permission selection
  const handleToggle = (permissionId: string) => {
    setSaveSuccess(false);
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  // Toggle entire resource group
  const handleToggleGroup = (group: PermissionGroup) => {
    setSaveSuccess(false);
    const groupIds = group.permissions.map((p) => p.id);
    const allChecked = groupIds.every((id) => selectedPermissionIds.has(id));

    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/roles/${selectedRoleId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissionIds: Array.from(selectedPermissionIds),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? "Failed to save permissions.");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-secondary-foreground" />
      </div>
    );
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isPresident = selectedRole?.name.toLowerCase() === "admin" || selectedRole?.name.toLowerCase() === "president";

  return (
    <div className="space-y-6">
      {/* Role Selector Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <Label htmlFor="role-selector" className="text-xs uppercase tracking-[0.22em] text-secondary-foreground">
            Configure Permissions for Role
          </Label>
          <select
            id="role-selector"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="flex h-11 w-64 rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm font-medium text-emerald-600 animate-fade-in">
              Permissions saved successfully!
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !selectedRoleId}
            className="rounded-full gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Matrix
          </Button>
        </div>
      </div>

      {/* Warnings & Errors */}
      {error && (
        <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isPresident && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 border border-amber-200/60 p-4 text-sm text-amber-800">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Protected Role Settings</p>
            <p className="mt-1 leading-relaxed text-amber-700">
              The Admin/President role maintains system-owner permissions by default. Modifying permissions for this role is not recommended.
            </p>
          </div>
        </div>
      )}

      {/* Permissions Grid */}
      <div className="space-y-6">
        {permissionGroups.map((group) => {
          const groupIds = group.permissions.map((p) => p.id);
          const allChecked = groupIds.every((id) => selectedPermissionIds.has(id));
          const someChecked = groupIds.some((id) => selectedPermissionIds.has(id)) && !allChecked;

          return (
            <div
              key={group.resource}
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_4px_20px_rgba(77,54,37,0.02)]"
            >
              {/* Group Title bar */}
              <div className="flex items-center justify-between bg-[#fcf8f1] px-5 py-4 border-b border-border/60">
                <div>
                  <h3 className="text-sm font-bold capitalize text-foreground">
                    {group.resource.replace("-", " ")}
                  </h3>
                  <p className="text-xs text-secondary-foreground mt-0.5">
                    Toggle permissions for the {group.resource} resource level
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary-foreground font-medium mr-1">
                    Select All
                  </span>
                  <Checkbox
                    checked={allChecked}
                    onChange={() => handleToggleGroup(group)}
                  />
                </div>
              </div>

              {/* Group Actions */}
              <div className="divide-y divide-border/40 px-5 bg-card">
                {group.permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div className="pr-4">
                      <p className="text-sm font-semibold capitalize text-foreground">
                        {permission.action}
                      </p>
                      <p className="text-xs text-secondary-foreground mt-1 leading-relaxed">
                        {permission.description ?? `Allows user to ${permission.action} ${group.resource}.`}
                      </p>
                    </div>
                    <Checkbox
                      checked={selectedPermissionIds.has(permission.id)}
                      onChange={() => handleToggle(permission.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
