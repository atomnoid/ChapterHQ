"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const createSchema = z.object({
  email: z.string().trim().email("Valid email address is required."),
  roleId: z.string().optional(),
  committeeId: z.string().optional(),
  emailTemplateId: z.string().optional(),
});
type CreateInput = z.infer<typeof createSchema>;

interface RoleOption {
  id: string;
  name: string;
}

interface CommitteeOption {
  id: string;
  name: string;
}

interface EmailTemplateOption {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateMemberDialog({ open, onOpenChange, onSuccess }: CreateMemberDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [committees, setCommittees] = useState<CommitteeOption[]>([]);
  const [templates, setTemplates] = useState<EmailTemplateOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateInput>({
    resolver: zodResolver(createSchema),
  });

  useEffect(() => {
    if (open) {
      reset({ email: "", roleId: "", committeeId: "", emailTemplateId: "" });
      Promise.all([
        fetch("/api/roles").then((res) => res.json()),
        fetch("/api/committees?limit=100").then((res) => res.json()),
        fetch("/api/email-templates?type=ORGANIZATION_INVITATION").then((res) => res.json()),
      ])
        .then(([roleData, committeeData, templateData]) => {
          setRoles(Array.isArray(roleData) ? roleData : roleData?.items ?? roleData?.data?.items ?? []);
          setCommittees(Array.isArray(committeeData) ? committeeData : committeeData?.items ?? committeeData?.data?.items ?? []);
          setTemplates(Array.isArray(templateData) ? templateData : templateData?.items ?? templateData?.data?.items ?? []);
        })
        .catch(() => {
          setRoles([]);
          setCommittees([]);
          setTemplates([]);
        });
    }
  }, [open, reset]);

  async function onSubmit(data: CreateInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          roleId: data.roleId || undefined,
          committeeId: data.committeeId || undefined,
          emailTemplateId: data.emailTemplateId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ? `Email could not be sent. ${json.message}` : "Email could not be sent.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (_err) {
      setServerError("An error occurred. Please try again.");
    }
  }

  function handleClose(val: boolean) {
    if (!isSubmitting) {
      setServerError(null);
      onOpenChange(val);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Add / Invite Member</DialogTitle>
          </div>
          <DialogDescription>
            Send an invitation to a new member to join your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="member-email">Email Address</Label>
            <Input
              id="member-email"
              type="email"
              placeholder="user@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {roles.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="member-role">Initial Role (Optional)</Label>
              <select
                id="member-role"
                {...register("roleId")}
                className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No specific role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {committees.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="member-committee">Committee Assignment (Optional)</Label>
              <select
                id="member-committee"
                {...register("committeeId")}
                className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No committee assignment</option>
                {committees.map((committee) => (
                  <option key={committee.id} value={committee.id}>
                    {committee.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {templates.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="member-email-template">Email Template</Label>
              <select
                id="member-email-template"
                {...register("emailTemplateId")}
                className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Use active organization invitation template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}{template.isActive ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {serverError && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
