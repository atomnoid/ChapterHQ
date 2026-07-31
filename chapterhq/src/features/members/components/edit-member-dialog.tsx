"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Status values from MemberStatus enum
const STATUSES = ["ACTIVE", "PENDING", "LEFT", "BLOCKED"] as const;
type MemberStatus = (typeof STATUSES)[number];

const updateSchema = z.object({
  status: z.enum(STATUSES),
});
type UpdateInput = z.infer<typeof updateSchema>;

interface Member {
  id: string;
  status: MemberStatus;
  user: { name: string | null; email: string | null };
}

interface EditMemberDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const statusLabels: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  LEFT: "Left",
  BLOCKED: "Blocked",
};

export function EditMemberDialog({ member, open, onOpenChange, onSuccess }: EditMemberDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateInput>({
    resolver: zodResolver(updateSchema),
  });

  useEffect(() => {
    if (member) reset({ status: member.status });
  }, [member, reset]);

  async function onSubmit(data: UpdateInput) {
    if (!member) return;
    setServerError(null);
    const res = await fetch(`/api/members/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) { setServerError(json.message ?? "Something went wrong."); return; }
    onOpenChange(false);
    onSuccess();
  }

  function handleClose(val: boolean) {
    if (!isSubmitting) { setServerError(null); onOpenChange(val); }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>
            Update status for{" "}
            <span className="font-medium text-foreground">
              {member?.user.name ?? member?.user.email ?? "this member"}
            </span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="member-status">Status</Label>
            <select
              id="member-status"
              {...register("status")}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
            {errors.status && (
              <p className="text-xs text-destructive">{errors.status.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => handleClose(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
