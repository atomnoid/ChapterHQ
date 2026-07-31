"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
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

interface Role {
  id: string;
  name: string;
}

interface DeleteRoleDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteRoleDialog({ role, open, onOpenChange, onSuccess }: DeleteRoleDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleDelete() {
    if (!role) return;
    setIsDeleting(true);
    setServerError(null);

    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to delete role.");
        return;
      }

      onOpenChange(false);
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  }

  // Prevent deleting the President role
  const isPresident = role?.name.toLowerCase() === "president";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(val) => {
        if (!isDeleting) {
          setServerError(null);
          onOpenChange(val);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </span>
            <AlertDialogTitle>Delete role</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {isPresident ? (
              <span>
                The role <span className="font-semibold text-foreground">{role?.name}</span> is protected and cannot be deleted.
              </span>
            ) : (
              <span>
                This will delete the role{" "}
                <span className="font-semibold text-foreground">{role?.name}</span>. Members assigned
                this role will lose its permissions. This is a soft-delete and can be restored by system administrators.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {serverError && (
          <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive mb-2">
            {serverError}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {!isPresident && (
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete role
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
