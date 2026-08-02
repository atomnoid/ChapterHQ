import { z } from "zod";
import { ORGANIZATION } from "@/constants/organization";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      ORGANIZATION.MIN_NAME_LENGTH,
      `Organization name must be at least ${ORGANIZATION.MIN_NAME_LENGTH} characters.`
    )
    .max(
      ORGANIZATION.MAX_NAME_LENGTH,
      `Organization name must be ${ORGANIZATION.MAX_NAME_LENGTH} characters or less.`
    ),

  slug: z
    .string()
    .trim()
    .min(
      ORGANIZATION.MIN_SLUG_LENGTH,
      `Slug must be at least ${ORGANIZATION.MIN_SLUG_LENGTH} characters.`
    )
    .max(
      ORGANIZATION.MAX_SLUG_LENGTH,
      `Slug must be ${ORGANIZATION.MAX_SLUG_LENGTH} characters or less.`
    )
    .regex(
      ORGANIZATION.SLUG_REGEX,
      "Slug may only contain letters, numbers, hyphens, and underscores."
    ),

  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or less.")
    .optional(),
});

export type CreateOrganizationInput =
  z.infer<typeof createOrganizationSchema>;

import { OrganizationStatus } from "@prisma/client";

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(
      ORGANIZATION.MIN_NAME_LENGTH,
      `Organization name must be at least ${ORGANIZATION.MIN_NAME_LENGTH} characters.`
    )
    .max(
      ORGANIZATION.MAX_NAME_LENGTH,
      `Organization name must be ${ORGANIZATION.MAX_NAME_LENGTH} characters or less.`
    )
    .optional(),
  slug: z
    .string()
    .trim()
    .min(
      ORGANIZATION.MIN_SLUG_LENGTH,
      `Slug must be at least ${ORGANIZATION.MIN_SLUG_LENGTH} characters.`
    )
    .max(
      ORGANIZATION.MAX_SLUG_LENGTH,
      `Slug must be ${ORGANIZATION.MAX_SLUG_LENGTH} characters or less.`
    )
    .regex(
      ORGANIZATION.SLUG_REGEX,
      "Slug may only contain letters, numbers, hyphens, and underscores."
    )
    .optional(),
  status: z.nativeEnum(OrganizationStatus).optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
