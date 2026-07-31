import { z } from "zod";
import { RoleScope } from "@prisma/client";

export const roleScopeSchema = z.nativeEnum(RoleScope);

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters.")
    .max(50, "Role name must be 50 characters or less."),
  description: z.string().trim().max(200, "Description must be 200 characters or less.").optional(),
  scope: roleScopeSchema.default("ORGANIZATION"),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Role name must be at least 2 characters.")
    .max(50, "Role name must be 50 characters or less.")
    .optional(),
  description: z.string().trim().max(200, "Description must be 200 characters or less.").optional(),
  scope: roleScopeSchema.optional(),
});

export const roleQuerySchema = z.object({
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive()),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type RoleQueryInput = z.infer<typeof roleQuerySchema>;
export type RoleScopeType = RoleScope;
