"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Award, UserPlus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MemberOption {
  id: string;
  user: { name: string | null; email: string | null };
}

const addCoreMemberSchema = z.object({
  memberId: z.string().min(1, "Member is required."),
  note: z.string().trim().max(200, "Note must be 200 characters or less.").optional(),
});
type AddCoreMemberInput = z.infer<typeof addCoreMemberSchema>;

interface AddCoreMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCoreMemberDialog({ open, onOpenChange, onSuccess }: AddCoreMemberDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddCoreMemberInput>({
    resolver: zodResolver(addCoreMemberSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({ memberId: "", note: "" });
    setServerError(null);
    setMembersLoading(true);
    fetch("/api/members?limit=100&status=ACTIVE")
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setMembers(d?.items ?? []))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [open, reset]);

  async function onSubmit(data: AddCoreMemberInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/core-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to designate member as Core Member.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Designate Core Member</DialogTitle>
          </div>
          <DialogDescription>Designate an existing organization member as a Core Member.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="core-member-select">Member</Label>
            <select id="core-member-select" {...register("memberId")}
              disabled={membersLoading}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60">
              <option value="">{membersLoading ? "Loading members…" : members.length === 0 ? "No members found" : "Select member…"}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.user.name ?? m.user.email}</option>
              ))}
            </select>
            {errors.memberId && <p className="text-xs text-destructive">{errors.memberId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="core-member-note">Note / Designation justification (Optional)</Label>
            <Input id="core-member-note" placeholder="e.g. Lead Technical Organizer" {...register("note")} />
            {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
          </div>

          {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Designate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
