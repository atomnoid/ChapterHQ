"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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

export type EventStatus = "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";

export interface Event {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  startDate: string;
  endDate: string | null;
  capacity: number | null;
  registrationRequired: boolean;
  status: EventStatus;
}

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(150, "Title must be 150 characters or less."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or less.")
    .optional(),
  venue: z
    .string()
    .trim()
    .max(200, "Venue must be 200 characters or less.")
    .optional(),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().optional(),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number.")
    .positive("Capacity must be a positive number.")
    .optional(),
  registrationRequired: z.boolean().optional().default(false),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional().default("DRAFT"),
});
type CreateInput = z.infer<typeof createSchema>;

const editSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(150, "Title must be 150 characters or less.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or less.")
    .optional(),
  venue: z
    .string()
    .trim()
    .max(200, "Venue must be 200 characters or less.")
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  capacity: z.coerce
    .number()
    .int("Capacity must be a whole number.")
    .positive("Capacity must be a positive number.")
    .optional(),
  registrationRequired: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "COMPLETED", "CANCELLED"]).optional(),
});
type EditInput = z.infer<typeof editSchema>;

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 16); // YYYY-MM-DDTHH:MM
}

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateEventDialog({ open, onOpenChange, onSuccess }: CreateEventDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateInput>({ resolver: zodResolver(createSchema) });

  const registrationRequiredVal = watch("registrationRequired");

  useEffect(() => {
    if (open) {
      reset({
        title: "",
        description: "",
        venue: "",
        startDate: "",
        endDate: "",
        capacity: undefined,
        registrationRequired: false,
        status: "DRAFT",
      });
      setServerError(null);
    }
  }, [open, reset]);

  async function onSubmit(data: CreateInput) {
    setServerError(null);
    try {
      const payload: Record<string, unknown> = {
        title: data.title,
        startDate: new Date(data.startDate).toISOString(),
      };
      if (data.description) payload.description = data.description;
      if (data.venue) payload.venue = data.venue;
      if (data.endDate) payload.endDate = new Date(data.endDate).toISOString();
      if (data.capacity) payload.capacity = Number(data.capacity);
      payload.registrationRequired = !!data.registrationRequired;
      if (data.status) payload.status = data.status;

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to create event.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An error occurred. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Create Event</DialogTitle>
          </div>
          <DialogDescription>Add a new event to the calendar.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="evt-title">Event Title</Label>
            <Input id="evt-title" placeholder="Annual General Meeting" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evt-desc">Description</Label>
            <textarea
              id="evt-desc"
              rows={3}
              placeholder="Provide a detailed description of the event..."
              {...register("description")}
              className="flex w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evt-venue">Venue</Label>
            <Input id="evt-venue" placeholder="Main Hall or Zoom" {...register("venue")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="evt-start">Start Date & Time</Label>
              <Input id="evt-start" type="datetime-local" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evt-end">End Date & Time</Label>
              <Input id="evt-end" type="datetime-local" {...register("endDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="evt-capacity">Capacity</Label>
              <Input id="evt-capacity" type="number" placeholder="Unlimited" {...register("capacity")} />
              {errors.capacity && <p className="text-xs text-destructive">{errors.capacity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evt-status">Status</Label>
              <select
                id="evt-status"
                {...register("status")}
                className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              id="evt-reg"
              type="checkbox"
              checked={!!registrationRequiredVal}
              onChange={(e) => setValue("registrationRequired", e.target.checked)}
              className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-ring"
            />
            <Label htmlFor="evt-reg" className="cursor-pointer">Require registration</Label>
          </div>

          {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditEventDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditEventDialog({ event, open, onOpenChange, onSuccess }: EditEventDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditInput>({ resolver: zodResolver(editSchema) });

  const registrationRequiredVal = watch("registrationRequired");

  useEffect(() => {
    if (open && event) {
      reset({
        title: event.title,
        description: event.description ?? "",
        venue: event.venue ?? "",
        startDate: toDateInputValue(event.startDate),
        endDate: toDateInputValue(event.endDate),
        capacity: event.capacity ?? undefined,
        registrationRequired: event.registrationRequired,
        status: event.status,
      });
      setServerError(null);
    }
  }, [open, event, reset]);

  async function onSubmit(data: EditInput) {
    if (!event) return;
    setServerError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (data.title) payload.title = data.title;
      payload.description = data.description ?? "";
      payload.venue = data.venue ?? "";
      if (data.startDate) payload.startDate = new Date(data.startDate).toISOString();
      payload.endDate = data.endDate ? new Date(data.endDate).toISOString() : null;
      payload.capacity = data.capacity ? Number(data.capacity) : null;
      payload.registrationRequired = !!data.registrationRequired;
      if (data.status) payload.status = data.status;

      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to update event.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An error occurred. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Edit Event</DialogTitle>
          </div>
          <DialogDescription>Update event parameters.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-evt-title">Event Title</Label>
            <Input id="edit-evt-title" placeholder="Annual General Meeting" {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-evt-desc">Description</Label>
            <textarea
              id="edit-evt-desc"
              rows={3}
              placeholder="Provide a detailed description of the event..."
              {...register("description")}
              className="flex w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-evt-venue">Venue</Label>
            <Input id="edit-evt-venue" placeholder="Main Hall or Zoom" {...register("venue")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-evt-start">Start Date & Time</Label>
              <Input id="edit-evt-start" type="datetime-local" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-evt-end">End Date & Time</Label>
              <Input id="edit-evt-end" type="datetime-local" {...register("endDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-evt-capacity">Capacity</Label>
              <Input id="edit-evt-capacity" type="number" placeholder="Unlimited" {...register("capacity")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-evt-status">Status</Label>
              <select
                id="edit-evt-status"
                {...register("status")}
                className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              id="edit-evt-reg"
              type="checkbox"
              checked={!!registrationRequiredVal}
              onChange={(e) => setValue("registrationRequired", e.target.checked)}
              className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-ring"
            />
            <Label htmlFor="edit-evt-reg" className="cursor-pointer">Require registration</Label>
          </div>

          {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteEventDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteEventDialog({ event, open, onOpenChange, onSuccess }: DeleteEventDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!event) return;
    setIsDeleting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setServerError(json.message ?? "Failed to delete event.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </span>
            <DialogTitle>Delete Event</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete the event <strong>{event?.title}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}

        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" className="rounded-full" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
