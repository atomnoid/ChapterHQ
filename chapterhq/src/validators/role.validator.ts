import { z } from "zod";
import { RoleScope } from "@prisma/client";
import { paginationQuerySchema } from "@/lib/pagination";

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

export const roleQuerySchema = paginationQuerySchema;

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type RoleQueryInput = z.infer<typeof roleQuerySchema>;
export type RoleScopeType = RoleScope;
