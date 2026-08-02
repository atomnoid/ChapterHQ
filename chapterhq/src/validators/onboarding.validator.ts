import { z } from "zod";

import { createOrganizationSchema } from "@/validators/organization.validator";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(64, "Password must be 64 characters or less.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.");

export const onboardingSchema = z
  .object({
    organizationName: createOrganizationSchema.shape.name,
    organizationSlug: createOrganizationSchema.shape.slug,
    organizationDescription: createOrganizationSchema.shape.description,
    superAdminName: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(60, "Name must be 60 characters or less."),
    superAdminEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address."),
    superAdminPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.superAdminPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;
