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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const editRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters.")
    .max(50, "Role name must be 50 characters or less."),
  description: z.string().trim().max(200, "Description must be 200 characters or less.").optional(),
});

type EditRoleInput = z.infer<typeof editRoleSchema>;

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface EditRoleDialogProps {
  role: Role | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditRoleDialog({ role, open, onOpenChange, onSuccess }: EditRoleDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditRoleInput>({
    resolver: zodResolver(editRoleSchema),
  });

  useEffect(() => {
    if (role) {
      reset({
        name: role.name,
        description: role.description ?? "",
      });
    }
  }, [role, reset]);

  async function onSubmit(data: EditRoleInput) {
    if (!role) return;
    setServerError(null);
    const res = await fetch(`/api/roles/${role.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      setServerError(json.message ?? "Something went wrong.");
      return;
    }

    onOpenChange(false);
    onSuccess();
  }

  function handleClose(val: boolean) {
    if (!isSubmitting) {
      setServerError(null);
      onOpenChange(val);
    }
  }

  // Prevent editing the Admin/President role name
  const isPresident = role?.name.toLowerCase() === "admin" || role?.name.toLowerCase() === "president";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
          <DialogDescription>Update settings for this role.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role-name">Role name</Label>
            <Input
              id="edit-role-name"
              placeholder="e.g. Secretary"
              {...register("name")}
              disabled={isPresident}
              aria-invalid={!!errors.name}
            />
            {isPresident && (
              <p className="text-xs text-secondary-foreground">The Admin/President role name is immutable.</p>
            )}
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-role-description">
              {isPresident ? "Display label" : "Description"}
            </Label>
            <Input
              id="edit-role-description"
              placeholder={isPresident ? "e.g. Chapter President" : "e.g. Manages announcements and documents"}
              {...register("description")}
              aria-invalid={!!errors.description}
            />
            {isPresident && (
              <p className="text-xs text-secondary-foreground">
                This label is shown in the UI. The internal role identity ("Admin" or "President") is used for authorization and cannot be changed.
              </p>
            )}
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

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
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
