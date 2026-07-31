"use client";

import { useState } from "react";
import { Loader2, UserX } from "lucide-react";
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

interface Member {
  id: string;
  user: { name: string | null; email: string | null };
}

interface DeleteMemberDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteMemberDialog({ member, open, onOpenChange, onSuccess }: DeleteMemberDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleDelete() {
    if (!member) return;
    setIsDeleting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/members/${member.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { setServerError(json.message ?? "Failed to remove member."); return; }
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(val) => { if (!isDeleting) { setServerError(null); onOpenChange(val); } }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <UserX className="h-4 w-4 text-destructive" />
            </span>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This will remove{" "}
            <span className="font-semibold text-foreground">
              {member?.user.name ?? member?.user.email ?? "this member"}
            </span>{" "}
            from the organization. This action performs a soft delete and can be reversed by an administrator.
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
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Remove member
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
