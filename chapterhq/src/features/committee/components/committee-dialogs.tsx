"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface Committee {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface MemberOption {
  id: string;
  user: { name: string | null; email: string | null };
}

// ── Create Committee Dialog ───────────────────────────────────────────────────

const committeeSchema = z.object({
  name: z.string().trim().min(1, "Committee name is required.").max(100),
  description: z.string().trim().max(500).optional(),
});
type CommitteeInput = z.infer<typeof committeeSchema>;

export function CreateCommitteeDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommitteeInput>({
    resolver: zodResolver(committeeSchema),
  });

  useEffect(() => {
    if (open) reset({ name: "", description: "" });
  }, [open, reset]);

  async function onSubmit(data: CommitteeInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/committees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to create committee.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (_err) {
      setServerError("An error occurred.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Create Committee</DialogTitle>
          </div>
          <DialogDescription>Add a new committee to organize team members and leadership.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="comm-name">Name</Label>
            <Input id="comm-name" placeholder="Executive Committee" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comm-desc">Description (Optional)</Label>
            <Input id="comm-desc" placeholder="Brief committee purpose…" {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          {serverError && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create Committee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Committee Dialog ─────────────────────────────────────────────────────

export function EditCommitteeDialog({
  committee,
  open,
  onOpenChange,
  onSuccess,
}: {
  committee: Committee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CommitteeInput>({
    resolver: zodResolver(committeeSchema),
  });

  useEffect(() => {
    if (committee) reset({ name: committee.name, description: committee.description ?? "" });
  }, [committee, reset]);

  async function onSubmit(data: CommitteeInput) {
    if (!committee) return;
    setServerError(null);
    try {
      const res = await fetch(`/api/committees/${committee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to update committee.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (_err) {
      setServerError("An error occurred.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Committee</DialogTitle>
          <DialogDescription>Update information for {committee?.name}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-comm-name">Name</Label>
            <Input id="edit-comm-name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-comm-desc">Description</Label>
            <Input id="edit-comm-desc" {...register("description")} />
          </div>

          {serverError && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Committee Dialog ───────────────────────────────────────────────────

export function DeleteCommitteeDialog({
  committee,
  open,
  onOpenChange,
  onSuccess,
}: {
  committee: Committee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleDelete() {
    if (!committee) return;
    setIsDeleting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/committees/${committee.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to delete committee.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-4 w-4 text-destructive" />
            </span>
            <AlertDialogTitle>Delete Committee</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold text-foreground">{committee?.name}</span>?
            This will soft-delete the committee and its member assignments.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {serverError && (
          <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive mb-2">
            {serverError}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" className="rounded-full" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete Committee
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Assign Member Dialog ──────────────────────────────────────────────────────

export function AssignMemberDialog({
  committeeId,
  open,
  onOpenChange,
  onSuccess,
}: {
  committeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedMemberId("");
      setServerError(null);
      fetch("/api/members?limit=100")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.items)) setMembers(data.items);
        })
        .catch(() => setMembers([]));
    }
  }, [open]);

  async function handleAssign() {
    if (!committeeId || !selectedMemberId) return;
    setIsSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/committees/${committeeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMemberId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to assign member.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch (_err) {
      setServerError("An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Assign Member to Committee</DialogTitle>
          </div>
          <DialogDescription>Select an organization member to add to this committee.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="assign-member-select">Select Member</Label>
            <select
              id="assign-member-select"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">-- Choose a member --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name ?? m.user.email}
                </option>
              ))}
            </select>
          </div>

          {serverError && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button className="rounded-full" onClick={handleAssign} disabled={isSubmitting || !selectedMemberId}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Assign Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
