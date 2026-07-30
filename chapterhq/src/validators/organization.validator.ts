import { z } from "zod";
import { ORGANIZATION } from "@/constants/organization";

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(ORGANIZATION.MIN_NAME_LENGTH)
    .max(ORGANIZATION.MAX_NAME_LENGTH),

  slug: z
    .string()
    .trim()
    .min(ORGANIZATION.MIN_SLUG_LENGTH)
    .max(ORGANIZATION.MAX_SLUG_LENGTH)
    .regex(ORGANIZATION.SLUG_REGEX),
});

export type CreateOrganizationInput =
  z.infer<typeof createOrganizationSchema>;