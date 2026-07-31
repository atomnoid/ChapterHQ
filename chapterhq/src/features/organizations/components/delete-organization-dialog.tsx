"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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

interface Organization {
  id: string;
  name: string;
}

interface DeleteOrganizationDialogProps {
  organization: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteOrganizationDialog({
  organization,
  open,
  onOpenChange,
  onSuccess,
}: DeleteOrganizationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleDelete() {
    if (!organization) return;
    setIsDeleting(true);
    setServerError(null);

    try {
      // Use settings PATCH with status: INACTIVE as soft-delete equivalent.
      // There is no DELETE /api/organizations endpoint — settings PATCH handles org status.
      const res = await fetch("/api/organization/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INACTIVE" }),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to deactivate organization.");
        return;
      }

      onOpenChange(false);
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(val) => { if (!isDeleting) { setServerError(null); onOpenChange(val); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-4 w-4 text-destructive" />
            </span>
            <AlertDialogTitle>Deactivate organization</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This will deactivate{" "}
            <span className="font-semibold text-foreground">{organization?.name}</span>. Members
            will lose access. This action can be reversed by reactivating the organization.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {serverError && (
          <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive mb-2">
            {serverError}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            className="rounded-full"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Deactivate
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
