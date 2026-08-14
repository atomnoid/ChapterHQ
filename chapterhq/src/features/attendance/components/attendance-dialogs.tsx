"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CheckSquare, Trash2 } from "lucide-react";
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

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

const markSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "LATE"]),
  notes: z.string().trim().max(500, "Notes must be 500 characters or less.").optional(),
});
type MarkInput = z.infer<typeof markSchema>;

interface MarkAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  eventId: string;
  memberId: string;
  memberName: string;
  initialStatus?: AttendanceStatus;
  initialNotes?: string;
}

export function MarkAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
  eventId,
  memberId,
  memberName,
  initialStatus = "PRESENT",
  initialNotes = "",
}: MarkAttendanceDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MarkInput>({
    resolver: zodResolver(markSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        status: initialStatus,
        notes: initialNotes,
      });
      setServerError(null);
    }
  }, [open, initialStatus, initialNotes, reset]);

  async function onSubmit(data: MarkInput) {
    setServerError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          status: data.status,
          notes: data.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to mark attendance.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckSquare className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Mark Attendance</DialogTitle>
          </div>
          <DialogDescription>
            Update status for <strong>{memberName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="att-status">Attendance Status</Label>
            <select
              id="att-status"
              {...register("status")}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att-notes">Notes (Optional)</Label>
            <Input id="att-notes" placeholder="e.g. Arrived 10 mins late" {...register("notes")} />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
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
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface BulkMarkAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  eventId: string;
  memberIds: string[];
  memberNames: string;
}

export function BulkMarkAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
  eventId,
  memberIds,
  memberNames,
}: BulkMarkAttendanceDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MarkInput>({
    resolver: zodResolver(markSchema),
  });

  useEffect(() => {
    if (open) {
      reset({ status: "PRESENT", notes: "" });
      setServerError(null);
    }
  }, [open, reset]);

  async function onSubmit(data: MarkInput) {
    setServerError(null);
    try {
      const items = memberIds.map((memberId) => ({
        memberId,
        status: data.status,
        notes: data.notes || undefined,
      }));

      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to mark bulk attendance.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CheckSquare className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Bulk Mark Attendance</DialogTitle>
          </div>
          <DialogDescription>
            Marking <strong>{memberIds.length} members</strong> as:
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-att-status">Attendance Status</Label>
            <select
              id="bulk-att-status"
              {...register("status")}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-att-notes">Notes for all (Optional)</Label>
            <Input id="bulk-att-notes" placeholder="e.g. Attended workshop" {...register("notes")} />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
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
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Apply Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface BulkDeleteAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  eventId: string;
  memberIds: string[];
  memberCount: number;
}

export function BulkDeleteAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
  eventId,
  memberIds,
  memberCount,
}: BulkDeleteAttendanceDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setServerError(null);
    }
  }, [open]);

  async function handleDelete() {
    setServerError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to delete attendance records.");
        setIsDeleting(false);
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isDeleting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </span>
            <DialogTitle>Delete Attendance Records</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to remove attendance records for <strong>{memberCount} member{memberCount !== 1 ? 's' : ''}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

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
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Delete Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
