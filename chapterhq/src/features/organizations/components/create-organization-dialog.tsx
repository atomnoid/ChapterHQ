"use client";

import { useState } from "react";
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

const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
});

type CreateOrgInput = z.infer<typeof createOrgSchema>;

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
  });

  async function onSubmit(data: CreateOrgInput) {
    setServerError(null);
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      setServerError(json.message ?? "Something went wrong.");
      return;
    }

    reset();
    onOpenChange(false);
    onSuccess();
  }

  function handleClose(val: boolean) {
    if (!isSubmitting) {
      reset();
      setServerError(null);
      onOpenChange(val);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Set up a new workspace for your chapter or organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              placeholder="e.g. Alpha Phi Society"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-slug">Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary-foreground shrink-0">chapterhq.io/</span>
              <Input
                id="org-slug"
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
              Create organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
