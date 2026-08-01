import { z } from "zod";
import { TransactionType } from "@prisma/client";

export const createFinanceSchema = z.object({
  type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: "Type must be either INCOME or EXPENSE." }),
  }),
  category: z
    .string()
    .trim()
    .min(1, "Category is required.")
    .max(100, "Category must be 100 characters or less."),
  amount: z
    .number()
    .positive("Amount must be greater than zero."),
  date: z
    .string()
    .datetime({ message: "Valid date string is required." })
    .or(z.date())
    .transform((val) => new Date(val)),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less.")
    .optional(),
});

export const updateFinanceSchema = createFinanceSchema.partial();

export const financeQuerySchema = z.object({
  search: z.string().optional(),
  type: z.nativeEnum(TransactionType).optional(),
  category: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CreateFinanceInput = z.infer<typeof createFinanceSchema>;
export type UpdateFinanceInput = z.infer<typeof updateFinanceSchema>;
export type FinanceQueryInput = z.infer<typeof financeQuerySchema>;
