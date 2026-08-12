"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renderEmailTemplate } from "@/lib/email-template";

type Member = { id: string; user: { name: string | null; email: string | null } };
type Template = { id: string; name: string; subject: string; bodyHtml: string; type: string; isActive: boolean };
type Role = { id: string; name: string };
type Committee = { id: string; name: string };

const previewVariables = {
  memberName: "Rahul Kumar",
  memberEmail: "rahul@example.com",
  organizationName: "ChapterHQ Demo",
  organizationSlug: "chapterhq-demo",
  committeeName: "Marketing",
  roleName: "Volunteer",
  invitationUrl: "http://localhost:3000/invitations/example",
  certificateUrl: "http://localhost:3000/certificates/example",
  eventName: "Annual Meeting",
  appointmentTitle: "Committee Coordinator",
  appointmentDate: "August 12, 2026",
  appointmentTime: "10:00 AM",
};

async function loadJson(url: string) {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message ?? "Unable to load data.");
  return payload.data?.items ?? payload.items ?? payload.data ?? payload;
}

export function ManualEmailDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    Promise.all([
      loadJson("/api/members?limit=100&status=ACTIVE"),
      loadJson("/api/email-templates?type=GENERAL"),
    ])
      .then(([memberData, templateData]) => {
        setMembers(memberData.items ?? memberData);
        const nextTemplates = templateData.items ?? templateData;
        setTemplates(nextTemplates);
        setTemplateId(nextTemplates.find((template: Template) => template.isActive)?.id ?? nextTemplates[0]?.id ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load email options."))
      .finally(() => setLoading(false));
  }, [open]);

  const selectedTemplate = templates.find((template) => template.id === templateId);
  const preview = useMemo(() => ({
    subject: selectedTemplate ? renderEmailTemplate(selectedTemplate.subject, previewVariables) : "",
    html: selectedTemplate ? renderEmailTemplate(selectedTemplate.bodyHtml, previewVariables) : "",
  }), [selectedTemplate]);

  async function sendEmail() {
    setSending(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/emails/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: selectedMemberIds, templateId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Email could not be sent.");
      setMessage(payload.message ?? "Manual email sent successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Email Members</DialogTitle><DialogDescription>Select explicit recipients and an organization email template.</DialogDescription></DialogHeader>
        {loading ? <div className="flex items-center gap-2 text-sm text-secondary-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading</div> : (
          <div className="space-y-4">
            <div className="space-y-2"><Label>Recipients</Label><div className="max-h-48 space-y-2 overflow-auto rounded-2xl border border-border p-3">{members.map((member) => <label key={member.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedMemberIds.includes(member.id)} onChange={(event) => setSelectedMemberIds((ids) => event.target.checked ? [...ids, member.id] : ids.filter((id) => id !== member.id))} />{member.user.name ?? member.user.email} <span className="text-secondary-foreground">{member.user.email}</span></label>)}</div><p className="text-xs text-secondary-foreground">Selected: {selectedMemberIds.length}</p></div>
            <div className="space-y-1.5"><Label>Email Template</Label><select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm"><option value="">Select email template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div>
            {selectedTemplate ? <div className="rounded-2xl border border-border p-4 text-sm"><p className="font-semibold">{preview.subject}</p><div className="mt-2 leading-6" dangerouslySetInnerHTML={{ __html: preview.html }} /></div> : <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Please create or select an email template before sending.</p>}
            {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
            {error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
          </div>
        )}
        <DialogFooter><Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button><Button className="rounded-full" onClick={sendEmail} disabled={sending || selectedMemberIds.length === 0 || !templateId}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Send Email</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseCsv(text: string) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",").map((header) => header.trim().toLowerCase());
  return lines.map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

export function BulkInviteDialog({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows([]);
    setResult(null);
    setError(null);
    Promise.all([
      loadJson("/api/email-templates?type=ORGANIZATION_INVITATION"),
      loadJson("/api/roles?limit=100"),
      loadJson("/api/committees?limit=100"),
    ]).then(([templateData, roleData, committeeData]) => {
      const nextTemplates = templateData.items ?? templateData;
      setTemplates(nextTemplates);
      setTemplateId(nextTemplates.find((template: Template) => template.isActive)?.id ?? nextTemplates[0]?.id ?? "");
      setRoles(roleData.items ?? roleData);
      setCommittees(committeeData.items ?? committeeData);
    }).catch((err) => setError(err instanceof Error ? err.message : "Unable to load bulk invite options."));
  }, [open]);

  const previewRows = rows.map((row) => {
    const role = roles.find((item) => item.name.toLowerCase() === (row.role ?? "").toLowerCase());
    const committee = committees.find((item) => item.name.toLowerCase() === (row.committee ?? "").toLowerCase());
    return { email: row.email, name: row.name, roleId: role?.id, committeeId: committee?.id, valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email ?? "") && (!(row.role) || !!role) && (!(row.committee) || !!committee) };
  });

  async function sendBulk() {
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch("/api/invitations/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailTemplateId: templateId, rows: previewRows.filter((row) => row.valid).map(({ email, name, roleId, committeeId }) => ({ email, name, roleId, committeeId })) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Bulk invitations could not be sent.");
      const results = payload.data?.results ?? [];
      setResult(`Successful: ${results.filter((item: { status: string }) => item.status === "SUCCESS").length}, Failed: ${results.filter((item: { status: string }) => item.status === "FAILED").length}, Skipped: ${results.filter((item: { status: string }) => item.status === "SKIPPED").length}`);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk invitations could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Bulk Import Invitations</DialogTitle><DialogDescription>Upload CSV columns: email,name,role,committee.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => { const blob = new Blob(["email,name,role,committee\nrahul@gmail.com,Rahul,Volunteer,Marketing\n"], { type: "text/csv" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "chapterhq-invite-template.csv"; link.click(); URL.revokeObjectURL(link.href); }}>Download CSV Template</Button>
          <div className="space-y-1.5"><Label>Email Template</Label><select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm"><option value="">Select email template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></div>
          <Input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; file.text().then((text) => setRows(parseCsv(text))).catch(() => setError("Invalid CSV file.")); }} />
          {rows.length > 0 ? <div className="max-h-64 overflow-auto rounded-2xl border border-border"><table className="w-full text-left text-sm"><thead className="bg-secondary"><tr><th className="px-3 py-2">Email</th><th>Name</th><th>Role</th><th>Committee</th><th>Status</th></tr></thead><tbody>{previewRows.map((row, index) => <tr key={`${row.email}-${index}`} className="border-t border-border"><td className="px-3 py-2">{row.email}</td><td>{row.name}</td><td>{roles.find((role) => role.id === row.roleId)?.name ?? ""}</td><td>{committees.find((committee) => committee.id === row.committeeId)?.name ?? ""}</td><td>{row.valid ? "Valid" : "Invalid"}</td></tr>)}</tbody></table></div> : null}
          {result ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{result}</p> : null}
          {error ? <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter><Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button><Button className="rounded-full" onClick={sendBulk} disabled={sending || !templateId || previewRows.filter((row) => row.valid).length === 0}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Send Valid Invites</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
