"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarDays, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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

// â”€â”€ Shared types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type AppointmentStatus = "ACTIVE" | "INACTIVE" | "REVOKED";

export interface Appointment {
  id: string;
  designation: string;
  startDate: string;
  endDate: string | null;
  status: AppointmentStatus;
  member: {
    id: string;
    user: { id: string; name: string | null; email: string | null; image: string | null };
  };
  committee: { id: string; name: string };
}

interface MemberOption {
  id: string;
  user: { name: string | null; email: string | null };
}

interface CommitteeOption {
  id: string;
  name: string;
}

// â”€â”€ Zod schemas (mirrors server validators) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const createSchema = z.object({
  committeeId: z.string().min(1, "Committee is required."),
  memberId: z.string().min(1, "Member is required."),
  designation: z
    .string()
    .trim()
    .min(2, "Designation must be at least 2 characters.")
    .max(100, "Designation must be 100 characters or less."),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "REVOKED"]).optional(),
});
type CreateInput = z.infer<typeof createSchema>;

const editSchema = z.object({
  designation: z
    .string()
    .trim()
    .min(2, "Designation must be at least 2 characters.")
    .max(100, "Designation must be 100 characters or less.")
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "REVOKED"]).optional(),
});
type EditInput = z.infer<typeof editSchema>;

// â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10); // "YYYY-MM-DD"
}

// â”€â”€ Create Appointment Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateAppointmentDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [committees, setCommittees] = useState<CommitteeOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateInput>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    if (!open) return;
    reset({ committeeId: "", memberId: "", designation: "", startDate: "", endDate: "", status: "ACTIVE" });
    setServerError(null);

    Promise.all([
      fetch("/api/members?limit=100").then((r) => r.json()),
      fetch("/api/committees?limit=100").then((r) => r.json()),
    ])
      .then(([m, c]) => {
        setMembers(Array.isArray(m?.items) ? m.items : Array.isArray(m?.data?.items) ? m.data.items : []);
        setCommittees(Array.isArray(c?.items) ? c.items : Array.isArray(c?.data?.items) ? c.data.items : []);
      })
      .catch(() => {
        setMembers([]);
        setCommittees([]);
      });
  }, [open, reset]);

  async function onSubmit(data: CreateInput) {
    setServerError(null);
    try {
      const payload: Record<string, unknown> = {
        committeeId: data.committeeId,
        memberId: data.memberId,
        designation: data.designation,
        startDate: data.startDate,
      };
      if (data.endDate) payload.endDate = data.endDate;
      if (data.status) payload.status = data.status;

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to create appointment.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    }
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
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>New Appointment</DialogTitle>
          </div>
          <DialogDescription>
            Assign a member to a committee with a designated role.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Committee */}
          <div className="space-y-1.5">
            <Label htmlFor="apt-committee">Committee</Label>
            <select
              id="apt-committee"
              {...register("committeeId")}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select committeeâ€¦</option>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.committeeId && (
              <p className="text-xs text-destructive">{errors.committeeId.message}</p>
            )}
          </div>

          {/* Member */}
          <div className="space-y-1.5">
            <Label htmlFor="apt-member">Member</Label>
            <select
              id="apt-member"
              {...register("memberId")}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select memberâ€¦</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name ?? m.user.email ?? m.id}
                </option>
              ))}
            </select>
            {errors.memberId && (
              <p className="text-xs text-destructive">{errors.memberId.message}</p>
            )}
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <Label htmlFor="apt-designation">Designation</Label>
            <Input
              id="apt-designation"
              placeholder="e.g. Chairperson"
              {...register("designation")}
            />
            {errors.designation && (
              <p className="text-xs text-destructive">{errors.designation.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="apt-start">Start Date</Label>
              <Input id="apt-start" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apt-end">End Date</Label>
              <Input id="apt-end" type="date" {...register("endDate")} />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="apt-status">Status</Label>
            <select
              id="apt-status"
              {...register("status")}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="REVOKED">Revoked</option>
            </select>
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
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Edit Appointment Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface EditAppointmentDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: EditAppointmentDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditInput>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (open && appointment) {
      reset({
        designation: appointment.designation,
        startDate: toDateInputValue(appointment.startDate),
        endDate: toDateInputValue(appointment.endDate),
        status: appointment.status,
      });
      setServerError(null);
    }
  }, [open, appointment, reset]);

  async function onSubmit(data: EditInput) {
    if (!appointment) return;
    setServerError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (data.designation) payload.designation = data.designation;
      if (data.startDate) payload.startDate = data.startDate;
      if (data.endDate) payload.endDate = data.endDate;
      if (data.status) payload.status = data.status;

      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to update appointment.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    }
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
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Edit Appointment</DialogTitle>
          </div>
          <DialogDescription>
            Update the appointment details for{" "}
            <strong>{appointment?.member.user.name ?? appointment?.member.user.email}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Read-only info */}
          <div className="rounded-2xl bg-secondary/40 px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-secondary-foreground uppercase tracking-wide">
              Committee
            </p>
            <p className="text-sm font-semibold text-foreground">
              {appointment?.committee.name ?? "â€”"}
            </p>
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-apt-designation">Designation</Label>
            <Input id="edit-apt-designation" placeholder="e.g. Chairperson" {...register("designation")} />
            {errors.designation && (
              <p className="text-xs text-destructive">{errors.designation.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-apt-start">Start Date</Label>
              <Input id="edit-apt-start" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-apt-end">End Date</Label>
              <Input id="edit-apt-end" type="date" {...register("endDate")} />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-apt-status">Status</Label>
            <select
              id="edit-apt-status"
              {...register("status")}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="REVOKED">Revoked</option>
            </select>
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
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€ Delete Appointment Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DeleteAppointmentDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: DeleteAppointmentDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) setServerError(null);
  }, [open]);

  async function handleDelete() {
    if (!appointment) return;
    setIsDeleting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to delete appointment.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isDeleting) { setServerError(null); onOpenChange(val); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </span>
            <DialogTitle>Delete Appointment</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete the{" "}
            <strong>{appointment?.designation}</strong> appointment for{" "}
            <strong>{appointment?.member.user.name ?? appointment?.member.user.email}</strong>?
            This action cannot be undone.
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
            onClick={() => { setServerError(null); onOpenChange(false); }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-full"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
