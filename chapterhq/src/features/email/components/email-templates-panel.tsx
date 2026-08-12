"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react";
import { Archive, Eye, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUPPORTED_EMAIL_VARIABLES, renderEmailTemplate } from "@/lib/email-template";

type TemplateType = "ORGANIZATION_INVITATION" | "APPOINTMENT_CREATED" | "CERTIFICATE_ISSUED" | "MANUAL" | "EVENT_REMINDER";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  type: TemplateType;
  isActive: boolean;
  archivedAt?: string | null;
};

const typeOptions: TemplateType[] = ["ORGANIZATION_INVITATION", "APPOINTMENT_CREATED", "CERTIFICATE_ISSUED", "MANUAL", "EVENT_REMINDER"];

const previewVariables = {
  memberName: "Rahul Sharma",
  memberEmail: "rahul@example.com",
  organizationName: "ChapterHQ Demo",
  organizationSlug: "chapterhq-demo",
  committeeName: "Events",
  roleName: "Volunteer",
  invitationUrl: "https://example.com/invite/token",
  certificateUrl: "https://example.com/certificates/123",
  eventName: "Annual Meetup",
  appointmentTitle: "Committee Coordinator",
  appointmentDate: "August 12, 2026",
  appointmentTime: "10:00 AM",
};

export function EmailTemplatesPanel() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", bodyHtml: "", type: "MANUAL" as TemplateType, isActive: false });

  async function loadTemplates() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/email-templates?search=${encodeURIComponent(search)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to load email templates.");
      setTemplates(payload.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load email templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadTemplates(); }, []);

  function edit(template: EmailTemplate) {
    setSelected(template);
    setForm({ name: template.name, subject: template.subject, bodyHtml: template.bodyHtml, type: template.type, isActive: template.isActive });
    setNotice(null);
    setError(null);
  }

  function newTemplate() {
    setSelected(null);
    setForm({ name: "", subject: "", bodyHtml: "", type: "MANUAL", isActive: false });
    setNotice(null);
    setError(null);
  }

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(selected ? `/api/email-templates/${selected.id}` : "/api/email-templates", {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to save template.");
      setNotice(payload.message ?? "Template saved.");
      await loadTemplates();
      if (!selected) newTemplate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save template.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveTemplate(template: EmailTemplate) {
    if (!confirm(`Archive ${template.name}?`)) return;
    const response = await fetch(`/api/email-templates/${template.id}`, { method: "DELETE" });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.message ?? "Unable to archive template.");
      return;
    }
    setNotice(payload.message ?? "Template archived.");
    await loadTemplates();
  }

  async function seedDefaults() {
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch("/api/email-templates/defaults", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to seed default templates.");
      setNotice(payload.message ?? "Default templates are available.");
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to seed default templates.");
    } finally {
      setSaving(false);
    }
  }

  const preview = useMemo(() => ({
    subject: renderEmailTemplate(form.subject, previewVariables),
    html: renderEmailTemplate(form.bodyHtml, previewVariables),
  }), [form.subject, form.bodyHtml]);

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-[1.75rem] border border-border bg-background p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Templates</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => void seedDefaults()} disabled={saving}>Defaults</Button>
            <Button size="sm" className="rounded-full" onClick={newTemplate}>New</Button>
          </div>
        </div>
        <Input className="mt-4" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadTemplates(); }} placeholder="Search templates" />
        {loading ? <div className="mt-5 flex items-center gap-2 text-sm text-secondary-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading</div> : null}
        {error ? <p className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        <div className="mt-5 space-y-2">
          {templates.map((template) => (
            <button key={template.id} type="button" onClick={() => edit(template)} className="w-full rounded-2xl border border-border px-4 py-3 text-left hover:bg-secondary">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{template.name}</p>
                {template.isActive ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Active</span> : null}
              </div>
              <p className="mt-1 truncate text-xs text-secondary-foreground">{template.type}</p>
            </button>
          ))}
          {!loading && templates.length === 0 ? <p className="text-sm text-secondary-foreground">No templates found.</p> : null}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-background p-5">
        <form className="space-y-5" onSubmit={saveTemplate}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{selected ? "Edit template" : "Create template"}</h2>
            <div className="flex gap-2">
              {selected ? <Button type="button" variant="outline" className="rounded-full" onClick={() => void archiveTemplate(selected)}><Archive className="mr-2 h-4 w-4" />Archive</Button> : null}
              <Button className="rounded-full" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>
            </div>
          </div>
          {notice ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Type</Label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TemplateType })} className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm"><option>{typeOptions[0]}</option>{typeOptions.slice(1).map((type) => <option key={type}>{type}</option>)}</select></div>
          </div>
          <div className="space-y-1.5"><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></div>
          <div className="space-y-1.5"><Label>Body HTML</Label><textarea value={form.bodyHtml} onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })} required rows={10} className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Set as active template for this type</label>
        </form>
        <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-2xl bg-secondary p-4 text-xs text-secondary-foreground">
            <p className="font-semibold text-foreground">Variables</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{SUPPORTED_EMAIL_VARIABLES.map((name) => <span key={name} className="rounded-full bg-background px-2 py-1">{"{{"}{name}{"}}"}</span>)}</div>
          </aside>
          <div className="rounded-2xl border border-border p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4" />Preview</p>
            <p className="text-sm font-medium">{preview.subject || "Subject preview"}</p>
            <div className="mt-3 text-sm leading-6" dangerouslySetInnerHTML={{ __html: preview.html || "Body preview" }} />
          </div>
        </div>
      </section>
    </div>
  );
}
