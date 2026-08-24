"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Award, Trash2, ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Certificate {
  id: string;
  title: string;
  description: string | null;
  issueDate: string;
  expiryDate: string | null;
  credentialId: string | null;
  certificateUrl: string | null;
  member: {
    id: string;
    user: { name: string | null; email: string | null };
  };
}

interface MemberOption {
  id: string;
  user: { name: string | null; email: string | null };
}

const generateSchema = z.object({
  memberId: z.string().min(1, "Member is required."),
  title: z.string().trim().min(2, "Title must be at least 2 characters.").max(150),
  description: z.string().trim().max(1000).optional(),
  issueDate: z.string().min(1, "Issue date is required."),
  expiryDate: z.string().optional(),
  credentialId: z.string().trim().max(100).optional(),
  certificateUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || val === "" || /^https?:\/\/.+/.test(val),
      { message: "Please enter a valid URL (must start with http:// or https://)." }
    ),
});
type GenerateInput = z.infer<typeof generateSchema>;

// â”€â”€ Generate Certificate Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GenerateCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GenerateCertificateDialog({ open, onOpenChange, onSuccess }: GenerateCertificateDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GenerateInput>({
    resolver: zodResolver(generateSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      memberId: "", title: "", description: "", issueDate: new Date().toISOString().split("T")[0],
      expiryDate: "", credentialId: "", certificateUrl: "",
    });
    setServerError(null);
    setMembersLoading(true);
    fetch("/api/members?limit=100&status=ACTIVE")
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setMembers(d?.items ?? d?.data?.items ?? []))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [open, reset]);

  async function onSubmit(data: GenerateInput) {
    setServerError(null);
    try {
      const payload: Record<string, unknown> = {
        memberId: data.memberId,
        title: data.title,
        issueDate: new Date(data.issueDate).toISOString(),
      };
      if (data.description?.trim()) payload.description = data.description.trim();
      if (data.expiryDate) payload.expiryDate = new Date(data.expiryDate).toISOString();
      if (data.credentialId?.trim()) payload.credentialId = data.credentialId.trim();
      if (data.certificateUrl?.trim()) payload.certificateUrl = data.certificateUrl.trim();

      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setServerError(json.message ?? "Failed to generate certificate."); return; }
      onOpenChange(false);
      onSuccess();
    } catch { setServerError("An unexpected error occurred."); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Generate Certificate</DialogTitle>
          </div>
          <DialogDescription>Issue a new certificate to a member.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="cert-member">Member</Label>
            <select id="cert-member" {...register("memberId")}
              disabled={membersLoading}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60">
              <option value="">{membersLoading ? "Loading members..." : members.length === 0 ? "No members found" : "Select member..."}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.user.name ?? m.user.email}</option>
              ))}
            </select>
            {errors.memberId && <p className="text-xs text-destructive">{errors.memberId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cert-title">Certificate Title</Label>
            <Input id="cert-title" placeholder="e.g. Certificate of Excellence" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cert-desc">Description (Optional)</Label>
            <textarea id="cert-desc" rows={2} {...register("description")}
              className="flex w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cert-issue">Issue Date</Label>
              <Input id="cert-issue" type="date" {...register("issueDate")} />
              {errors.issueDate && <p className="text-xs text-destructive">{errors.issueDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert-expiry">Expiry Date</Label>
              <Input id="cert-expiry" type="date" {...register("expiryDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cert-cred">Credential ID (Optional)</Label>
            <Input id="cert-cred" placeholder="e.g. CHQ-2026-001" {...register("credentialId")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cert-url">Certificate Link (Optional)</Label>
            <Input
              id="cert-url"
              type="url"
              placeholder="https://example.com/certificate"
              {...register("certificateUrl")}
            />
            {errors.certificateUrl && <p className="text-xs text-destructive">{errors.certificateUrl.message}</p>}
            <p className="text-[11px] text-secondary-foreground">
              A URL to the actual certificate document or verification page. Leave blank if not applicable.
            </p>
          </div>

          {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Delete Certificate Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DeleteCertificateDialogProps {
  certificate: Certificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteCertificateDialog({ certificate, open, onOpenChange, onSuccess }: DeleteCertificateDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!certificate) return;
    setIsDeleting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/certificates/${certificate.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); setServerError(j.message ?? "Failed to delete."); return; }
      onOpenChange(false);
      onSuccess();
    } catch { setServerError("An unexpected error occurred."); }
    finally { setIsDeleting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isDeleting && onOpenChange(v)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </span>
            <DialogTitle>Delete Certificate</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to revoke <strong>{certificate?.title}</strong> issued to{" "}
            <strong>{certificate?.member.user.name ?? certificate?.member.user.email}</strong>?
          </DialogDescription>
        </DialogHeader>
        {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}
        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isDeleting}>Cancel</Button>
          <Button variant="destructive" className="rounded-full" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Revoke &amp; Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
