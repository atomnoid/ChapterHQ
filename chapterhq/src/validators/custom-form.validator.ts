import { z } from "zod";

export const CUSTOM_FORM_FIELD_TYPES = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "DATE",
  "DROPDOWN",
  "RADIO",
  "CHECKBOX",
  "YES_NO",
] as const;

const fieldOptionSchema = z.object({
  label: z.string().min(1, "Label is required"),
  value: z.string().min(1, "Value is required"),
});

export const createCustomFormFieldSchema = z
  .object({
    label: z.string().trim().min(1, "Field label is required").max(255, "Label must be 255 characters or less"),
    key: z.string().trim().min(1, "Field key is required").max(100, "Key must be 100 characters or less"),
    type: z.enum(CUSTOM_FORM_FIELD_TYPES, { message: "Invalid field type" }),
    required: z.boolean().default(false),
    placeholder: z.string().max(255).optional().nullable(),
    helpText: z.string().max(500).optional().nullable(),
    options: z.array(fieldOptionSchema).optional().nullable(),
    order: z.number().int().nonnegative().default(0),
  })
  .refine(
    (data) => {
      // Options required for select/radio/checkbox fields
      const needsOptions = ["DROPDOWN", "RADIO", "CHECKBOX"].includes(data.type);
      return !needsOptions || (data.options && data.options.length > 0);
    },
    {
      message: "Options are required for dropdown, radio, and checkbox fields",
      path: ["options"],
    }
  );

export const createCustomFormSchema = z.object({
  name: z.string().trim().min(1, "Form name is required").max(255, "Name must be 255 characters or less"),
  description: z.string().max(1000).optional().nullable(),
  required: z.boolean().default(false),
  committeeId: z.string().optional().nullable(),
  fields: z.array(createCustomFormFieldSchema).default([]),
});

export const updateCustomFormSchema = z.object({
  name: z.string().trim().min(1, "Form name is required").max(255, "Name must be 255 characters or less").optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  required: z.boolean().optional(),
  committeeId: z.string().optional().nullable(),
  fields: z.array(createCustomFormFieldSchema).optional(),
});

export const updateCustomFormFieldSchema = z.object({
  label: z.string().trim().min(1, "Field label is required").max(255, "Label must be 255 characters or less").optional(),
  type: z.enum(CUSTOM_FORM_FIELD_TYPES, { message: "Invalid field type" }).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().max(255).optional().nullable(),
  helpText: z.string().max(500).optional().nullable(),
  options: z.array(fieldOptionSchema).optional().nullable(),
  order: z.number().int().nonnegative().optional(),
});

// Submission validation
export const submitCustomFormSchema = z.object({
  answers: z.record(
    z.string(),
    z.union([z.string().nullable(), z.boolean(), z.array(z.string())])
  ),
});

export type CreateCustomFormInput = z.infer<typeof createCustomFormSchema>;
export type UpdateCustomFormInput = z.infer<typeof updateCustomFormSchema>;
export type CreateCustomFormFieldInput = z.infer<typeof createCustomFormFieldSchema>;
export type SubmitCustomFormInput = z.infer<typeof submitCustomFormSchema>;
