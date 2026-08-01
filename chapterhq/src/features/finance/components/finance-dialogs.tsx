"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
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

export type TransactionType = "INCOME" | "EXPENSE";

export interface FinanceRecord {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  description: string | null;
}

const financeRecordSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], {
    errorMap: () => ({ message: "Type must be either INCOME or EXPENSE." }),
  }),
  category: z
    .string()
    .trim()
    .min(1, "Category is required.")
    .max(100, "Category must be 100 characters or less."),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than zero."),
  date: z.string().min(1, "Date is required."),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less.")
    .optional(),
});

type FinanceFormInput = z.infer<typeof financeRecordSchema>;

interface CreateFinanceRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateFinanceRecordDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateFinanceRecordDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinanceFormInput>({
    resolver: zodResolver(financeRecordSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        type: "INCOME",
        category: "",
        amount: undefined,
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
      setServerError(null);
    }
  }, [open, reset]);

  async function onSubmit(data: FinanceFormInput) {
    setServerError(null);
    try {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to create transaction.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred.");
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
            <DialogTitle>New Transaction</DialogTitle>
          </div>
          <DialogDescription>Add a new income or expense transaction.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="fin-type">Transaction Type</Label>
            <select
              id="fin-type"
              {...register("type")}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fin-category">Category</Label>
            <Input id="fin-category" placeholder="e.g. Sponsorship, Supplies" {...register("category")} />
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fin-amount">Amount ($)</Label>
              <Input id="fin-amount" type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fin-date">Date</Label>
              <Input id="fin-date" type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fin-desc">Description (Optional)</Label>
            <textarea
              id="fin-desc"
              rows={3}
              placeholder="Provide transaction details..."
              {...register("description")}
              className="flex w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditFinanceRecordDialogProps {
  record: FinanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditFinanceRecordDialog({
  record,
  open,
  onOpenChange,
  onSuccess,
}: EditFinanceRecordDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinanceFormInput>({
    resolver: zodResolver(financeRecordSchema),
  });

  useEffect(() => {
    if (open && record) {
      reset({
        type: record.type,
        category: record.category,
        amount: record.amount,
        date: record.date.split("T")[0],
        description: record.description ?? "",
      });
      setServerError(null);
    }
  }, [open, record, reset]);

  async function onSubmit(data: FinanceFormInput) {
    if (!record) return;
    setServerError(null);
    try {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      const res = await fetch(`/api/finance/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.message ?? "Failed to update transaction.");
        return;
      }
      onOpenChange(false);
      onSuccess();
    } catch {
      setServerError("An unexpected error occurred.");
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
            <DialogTitle>Edit Transaction</DialogTitle>
          </div>
          <DialogDescription>Modify transaction parameters.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-fin-type">Transaction Type</Label>
            <select
              id="edit-fin-type"
              {...register("type")}
              className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-fin-category">Category</Label>
            <Input id="edit-fin-category" placeholder="e.g. Sponsorship" {...register("category")} />
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-fin-amount">Amount ($)</Label>
              <Input id="edit-fin-amount" type="number" step="0.01" {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-fin-date">Date</Label>
              <Input id="edit-fin-date" type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-fin-desc">Description (Optional)</Label>
            <textarea
              id="edit-fin-desc"
              rows={3}
              {...register("description")}
              className="flex w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
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

interface DeleteFinanceRecordDialogProps {
  record: FinanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteFinanceRecordDialog({
  record,
  open,
  onOpenChange,
  onSuccess,
}: DeleteFinanceRecordDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!record) return;
    setIsDeleting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/finance/${record.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setServerError(json.message ?? "Failed to delete transaction.");
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
    <Dialog open={open} onOpenChange={(v) => !isDeleting && onOpenChange(v)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </span>
            <DialogTitle>Delete Transaction</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete this transaction for <strong>{record?.category} ({record?.amount})</strong>? This action cannot be undone.
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
