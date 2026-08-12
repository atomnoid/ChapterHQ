"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { Building2, Edit3, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrganizationStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

interface PermissionResponse {
  permissions: string[];
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function statusClass(status: OrganizationStatus) {
  if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700";
  if (status === "INACTIVE") return "bg-amber-100 text-amber-700";
  return "bg-destructive/10 text-destructive";
}

export function SettingsPanel() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<OrganizationStatus>("ACTIVE");
  const [formError, setFormError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/organization/settings");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to load organization settings.");
      if (!payload?.id || !payload?.name || !payload?.slug || !payload?.status) {
        throw new Error("Organization settings returned an unexpected response.");
      }
      setOrganization(payload as Organization);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load organization settings.");
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/permissions")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: PermissionResponse | null) => { if (!cancelled) setPermissions(payload?.permissions ?? []); })
      .catch(() => { if (!cancelled) setPermissions([]); });
    return () => { cancelled = true; };
  }, []);

  const canUpdate = permissions.includes("settings:update");

  function beginEdit() {
    if (!organization) return;
    setName(organization.name);
    setSlug(organization.slug);
    setDescription(organization.description ?? "");
    setStatus(organization.status);
    setFormError(null);
    setNotice(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setFormError(null);
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/organization/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description, status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setFormError(payload.message ?? "Unable to save organization settings.");
        return;
      }
      const updated = payload.data;
      if (!updated?.id || !updated?.name || !updated?.slug || !updated?.status) {
        setFormError("Organization settings returned an unexpected response.");
        return;
      }
      setOrganization(updated as Organization);
      setEditing(false);
      setNotice(payload.message ?? "Organization settings updated successfully.");
    } catch {
      setFormError("Unable to save organization settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="h-80 animate-pulse rounded-[1.75rem] bg-secondary" /><div className="h-56 animate-pulse rounded-[1.75rem] bg-secondary" /></div>;
  }

  if (error) {
    return <div className="rounded-[1.75rem] border border-border bg-destructive/5 px-6 py-5"><p className="text-sm font-semibold text-destructive">{error}</p><Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => void loadSettings()}>Try again</Button></div>;
  }

  if (!organization) {
    return <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-background px-6 py-14 text-center"><Building2 className="h-6 w-6 text-secondary-foreground" /><p className="mt-4 text-sm font-semibold text-foreground">Organization settings are unavailable</p><p className="mt-1 text-sm text-secondary-foreground">Select an active organization and try again.</p></div>;
  }

  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-secondary-foreground">Manage the active organization&apos;s profile and availability.</p></div>{canUpdate && !editing && <Button className="rounded-full" onClick={beginEdit}><Edit3 className="mr-2 h-4 w-4" />Edit settings</Button>}</div>{notice && <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>{notice}</span><button className="font-medium" onClick={() => setNotice(null)}>Dismiss</button></div>}<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="rounded-[1.75rem] border border-border bg-background p-5 sm:p-6">{editing ? <form className="space-y-5" onSubmit={saveSettings} noValidate><div><h3 className="text-lg font-semibold text-foreground">Edit organization</h3><p className="mt-1 text-sm text-secondary-foreground">Only organization name, slug, and status can be changed here.</p></div><div className="space-y-1.5"><Label htmlFor="settings-name">Organization name</Label><Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} /><p className="text-xs text-secondary-foreground">Use 2–80 characters.</p></div><div className="space-y-1.5"><Label htmlFor="settings-slug">Slug</Label><Input id="settings-slug" value={slug} onChange={(event) => setSlug(event.target.value)} required maxLength={40} /><p className="text-xs text-secondary-foreground">Letters, numbers, hyphens, and underscores only.</p></div><div className="space-y-1.5"><Label htmlFor="settings-status">Status</Label><select id="settings-status" value={status} onChange={(event) => setStatus(event.target.value as OrganizationStatus)} className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option></select></div>{formError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{formError}</div>}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" className="rounded-full" disabled={saving} onClick={cancelEdit}><X className="mr-2 h-4 w-4" />Cancel</Button><Button type="submit" className="rounded-full" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save changes</Button></div></form> : <div className="space-y-6"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></span><div className="min-w-0"><h3 className="truncate text-lg font-semibold text-foreground">{organization.name}</h3><p className="mt-1 text-sm text-secondary-foreground">chapterhq.io/{organization.slug}</p></div></div><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-secondary-foreground">Description</p><p className="mt-2 text-sm leading-6 text-foreground">{organization.description || "No description has been provided."}</p></div><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-secondary-foreground">Status</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(organization.status)}`}>{organization.status.charAt(0) + organization.status.slice(1).toLowerCase()}</span></div></div></div>}</div><aside className="rounded-[1.75rem] border border-border bg-background p-5 sm:p-6"><h3 className="text-sm font-semibold text-foreground">Organization details</h3><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-secondary-foreground">Created</dt><dd className="mt-1 font-medium text-foreground">{formatDate(organization.createdAt)}</dd></div><div><dt className="text-secondary-foreground">Last updated</dt><dd className="mt-1 font-medium text-foreground">{formatDate(organization.updatedAt)}</dd></div><div><dt className="text-secondary-foreground">Organization ID</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{organization.id}</dd></div></dl></aside></div></div>;
}
