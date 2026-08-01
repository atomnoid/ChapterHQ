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

export type InventoryStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  location: string | null;
  status: InventoryStatus;
}

const inventorySchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(150),
  category: z.string().trim().max(100).optional(),
  quantity: z.coerce.number().int("Must be a whole number.").min(0, "Cannot be negative."),
  unit: z.string().trim().max(50).optional(),
  location: z.string().trim().max(150).optional(),
  status: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]),
});
type InventoryInput = z.infer<typeof inventorySchema>;

// ── Create ───────────────────────────────────────────────────────────────────

interface CreateInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInventoryDialog({ open, onOpenChange, onSuccess }: CreateInventoryDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InventoryInput>({
    resolver: zodResolver(inventorySchema),
  });

  useEffect(() => {
    if (open) {
      reset({ name: "", category: "", quantity: 0, unit: "", location: "", status: "IN_STOCK" });
      setServerError(null);
    }
  }, [open, reset]);

  async function onSubmit(data: InventoryInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setServerError(json.message ?? "Failed to create item."); return; }
      onOpenChange(false);
      onSuccess();
    } catch { setServerError("An unexpected error occurred."); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Add Inventory Item</DialogTitle>
          </div>
          <DialogDescription>Add a new item to the inventory.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="inv-name">Item Name</Label>
            <Input id="inv-name" placeholder="e.g. Projector" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-category">Category</Label>
              <Input id="inv-category" placeholder="e.g. Electronics" {...register("category")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-unit">Unit</Label>
              <Input id="inv-unit" placeholder="e.g. pcs, kg" {...register("unit")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-quantity">Quantity</Label>
              <Input id="inv-quantity" type="number" min="0" {...register("quantity")} />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-status">Status</Label>
              <select id="inv-status" {...register("status")} className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inv-location">Location</Label>
            <Input id="inv-location" placeholder="e.g. Storage Room A" {...register("location")} />
          </div>

          {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit ─────────────────────────────────────────────────────────────────────

interface EditInventoryDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditInventoryDialog({ item, open, onOpenChange, onSuccess }: EditInventoryDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InventoryInput>({
    resolver: zodResolver(inventorySchema),
  });

  useEffect(() => {
    if (open && item) {
      reset({ name: item.name, category: item.category ?? "", quantity: item.quantity, unit: item.unit ?? "", location: item.location ?? "", status: item.status });
      setServerError(null);
    }
  }, [open, item, reset]);

  async function onSubmit(data: InventoryInput) {
    if (!item) return;
    setServerError(null);
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setServerError(json.message ?? "Failed to update item."); return; }
      onOpenChange(false);
      onSuccess();
    } catch { setServerError("An unexpected error occurred."); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </span>
            <DialogTitle>Edit Item</DialogTitle>
          </div>
          <DialogDescription>Update inventory item details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="edit-inv-name">Item Name</Label>
            <Input id="edit-inv-name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-inv-category">Category</Label>
              <Input id="edit-inv-category" {...register("category")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-inv-unit">Unit</Label>
              <Input id="edit-inv-unit" {...register("unit")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-inv-quantity">Quantity</Label>
              <Input id="edit-inv-quantity" type="number" min="0" {...register("quantity")} />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-inv-status">Status</Label>
              <select id="edit-inv-status" {...register("status")} className="flex h-11 w-full rounded-2xl border border-border bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-inv-location">Location</Label>
            <Input id="edit-inv-location" {...register("location")} />
          </div>

          {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete ────────────────────────────────────────────────────────────────────

interface DeleteInventoryDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteInventoryDialog({ item, open, onOpenChange, onSuccess }: DeleteInventoryDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!item) return;
    setIsDeleting(true);
    setServerError(null);
    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); setServerError(j.message ?? "Failed to delete."); return; }
      onOpenChange(false);
      onSuccess();
    } catch { setServerError("An unexpected error occurred."); }
    finally { setIsDeleting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isDeleting && onOpenChange(v)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </span>
            <DialogTitle>Delete Item</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete <strong>{item?.name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {serverError && <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{serverError}</div>}
        <DialogFooter>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={isDeleting}>Cancel</Button>
          <Button variant="destructive" className="rounded-full" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
