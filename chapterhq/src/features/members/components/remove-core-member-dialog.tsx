"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RemoveCoreMemberDialogProps {
  coreMemberId: string | null;
  coreMemberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RemoveCoreMemberDialog({ coreMemberId, coreMemberName, open, onOpenChange, onSuccess }: RemoveCoreMemberDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  async function handleRemove() {
    if (!coreMemberId) return;
    setIsRemoving(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/core-members/${coreMemberId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        setServerError(j.message ?? "Failed to remove core member designation.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isRemoving && onOpenChange(v)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </span>
            <DialogTitle>Remove Core Member</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to remove Core Member status for <strong>{coreMemberName}</strong>? This does not remove them from the organization.
          </DialogDescription>
        </DialogHeader>
        {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}
        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isRemoving}>Cancel</Button>
          <Button variant="destructive" className="rounded-full" onClick={handleRemove} disabled={isRemoving}>
            {isRemoving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Remove Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
