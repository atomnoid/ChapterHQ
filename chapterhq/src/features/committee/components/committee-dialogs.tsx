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
  appointments?: Array<{
    id: string;
    designation: string;
    member: {
      id: string;
      user: {
        name: string | null;
        email: string | null;
      };
    };
  }>;
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
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedMemberIds([]);
      setSearchQuery("");
      setServerError(null);
      fetch("/api/members?limit=100")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.items)) setMembers(data.items);
        })
        .catch(() => setMembers([]));
    }
  }, [open]);

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const name = (m.user.name ?? "").toLowerCase();
    const email = (m.user.email ?? "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedMemberIds.length === filteredMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(filteredMembers.map((m) => m.id));
    }
  };

  async function handleAssign() {
    if (!committeeId || selectedMemberIds.length === 0) return;
    setIsSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/committees/${committeeId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: selectedMemberIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to assign members.");
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
      <DialogContent className="max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Assign Members to Committee</DialogTitle>
          </div>
          <DialogDescription>Select one or more organization members to add to this committee.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="relative">
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">
              {selectedMemberIds.length} of {filteredMembers.length} Selected
            </span>
            <Button
              variant="link"
              onClick={toggleAll}
              className="h-auto p-0 text-xs font-semibold text-primary"
            >
              {selectedMemberIds.length === filteredMembers.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y border rounded-xl bg-card max-h-[40vh] p-2 space-y-1">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m) => {
                const isChecked = selectedMemberIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-[#fcf8f1] rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleMember(m.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">{m.user.name ?? "—"}</p>
                      <p className="text-xs text-secondary-foreground">{m.user.email}</p>
                    </div>
                  </label>
                );
              })
            ) : (
              <div className="text-center py-6 text-sm text-secondary-foreground">
                No members match your search.
              </div>
            )}
          </div>

          {serverError && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive shrink-0">
              {serverError}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2 border-t">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="rounded-full"
            onClick={handleAssign}
            disabled={isSubmitting || selectedMemberIds.length === 0}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Assign ({selectedMemberIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
