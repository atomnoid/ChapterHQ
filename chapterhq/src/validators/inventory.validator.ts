import { z } from "zod";
import { InventoryStatus } from "@prisma/client";

export const createInventoryItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(150, "Name must be 150 characters or less."),
  category: z
    .string()
    .trim()
    .max(100, "Category must be 100 characters or less.")
    .optional(),
  quantity: z
    .number()
    .int("Quantity must be an integer.")
    .min(0, "Quantity cannot be negative.")
    .default(0),
  unit: z
    .string()
    .trim()
    .max(50, "Unit must be 50 characters or less.")
    .optional(),
  location: z
    .string()
    .trim()
    .max(150, "Location must be 150 characters or less.")
    .optional(),
  status: z
    .nativeEnum(InventoryStatus)
    .default(InventoryStatus.IN_STOCK),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const inventoryQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.nativeEnum(InventoryStatus).optional(),
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(10000).default(10),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
