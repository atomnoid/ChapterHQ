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

const editOrgSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80).optional(),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens.")
    .optional(),
});

type EditOrgInput = z.infer<typeof editOrgSchema>;

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface EditOrganizationDialogProps {
  organization: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditOrganizationDialog({
  organization,
  open,
  onOpenChange,
  onSuccess,
}: EditOrganizationDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditOrgInput>({
    resolver: zodResolver(editOrgSchema),
    defaultValues: {
      name: organization?.name ?? "",
      slug: organization?.slug ?? "",
    },
  });

  // Sync form values when the target organization changes
  useEffect(() => {
    if (organization) {
      reset({ name: organization.name, slug: organization.slug });
    }
  }, [organization, reset]);

  async function onSubmit(data: EditOrgInput) {
    setServerError(null);
    const res = await fetch("/api/organization/settings", {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit organization</DialogTitle>
          <DialogDescription>Update the name or slug for this organization.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-org-name">Organization name</Label>
            <Input
              id="edit-org-name"
              placeholder="e.g. Alpha Phi Society"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-org-slug">Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary-foreground shrink-0">chapterhq.io/</span>
              <Input
                id="edit-org-slug"
                placeholder="alpha-phi"
                {...register("slug")}
                aria-invalid={!!errors.slug}
              />
            </div>
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
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
