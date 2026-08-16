import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-logger";
import { CustomFormRepository } from "@/repositories/custom-form.repository";
import { MemberRepository } from "@/repositories/member.repository";
import type { CreateCustomFormInput, UpdateCustomFormInput } from "@/validators/custom-form.validator";
import { CustomFormFieldType } from "@prisma/client";

export class CustomFormNotFoundError extends Error {
  constructor() {
    super("Form not found or you do not have permission to access it.");
    this.name = "CustomFormNotFoundError";
  }
}

export class CustomFormService {
  constructor(
    private readonly formRepository = new CustomFormRepository(),
    private readonly memberRepository = new MemberRepository()
  ) {}

  async createForm(
    organizationId: string,
    createdByUserId: string,
    input: CreateCustomFormInput
  ) {
    // Get user's member record to track who created it
    const member = await this.memberRepository.findByOrganizationAndUser(organizationId, createdByUserId);
    if (!member) {
      throw new Error("User is not a member of this organization");
    }

    // Create the form
    const form = await this.formRepository.create({
      organizationId,
      name: input.name,
      description: input.description,
      required: input.required,
      createdBy: createdByUserId,
    });

    // Add fields
    const fieldsWithOrder = input.fields.map((field, index) => ({
      ...field,
      order: field.order ?? index,
    }));

    const fieldsData = await Promise.all(
      fieldsWithOrder.map((field) =>
        prisma.customFormField.create({
          data: {
            formId: form.id,
            label: field.label,
            key: field.key,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            helpText: field.helpText,
            options: field.options || null,
            order: field.order,
          },
        })
      )
    );

    // Log activity
    await logActivity(
      { userId: createdByUserId, organizationId },
      "create",
      "forms",
      form.id,
      input.name,
      { fieldCount: fieldsData.length, required: input.required }
    );

    return {
      ...form,
      fields: fieldsData,
    };
  }

  async getForm(organizationId: string, formId: string) {
    const form = await this.formRepository.findByIdAndOrganization(formId, organizationId);
    if (!form) {
      throw new CustomFormNotFoundError();
    }
    return form;
  }

  async listForms(organizationId: string, options?: { status?: "ACTIVE" | "INACTIVE"; required?: boolean }) {
    return this.formRepository.listByOrganization(organizationId, options);
  }

  async updateForm(
    organizationId: string,
    formId: string,
    updatedByUserId: string,
    input: UpdateCustomFormInput
  ) {
    const form = await this.formRepository.findByIdAndOrganization(formId, organizationId);
    if (!form) {
      throw new CustomFormNotFoundError();
    }

    const updated = await this.formRepository.update(formId, organizationId, {
      name: input.name,
      description: input.description,
      status: input.status,
      required: input.required,
    });

    // If fields are provided, update them
    if (input.fields && input.fields.length > 0) {
      // Delete existing fields
      await prisma.customFormField.deleteMany({
        where: { formId },
      });

      // Create new fields
      const newFields = await Promise.all(
        input.fields.map((field, index) =>
          prisma.customFormField.create({
            data: {
              formId,
              label: field.label,
              key: field.key,
              type: field.type as CustomFormFieldType,
              required: field.required,
              placeholder: field.placeholder,
              helpText: field.helpText,
              options: field.options || null,
              order: field.order ?? index,
            },
          })
        )
      );

      if (updated) {
        (updated as any).fields = newFields;
      }
    }

    await logActivity(
      { userId: updatedByUserId, organizationId },
      "update",
      "forms",
      formId,
      form.name
    );

    return updated;
  }

  async deleteForm(organizationId: string, formId: string, deletedByUserId: string) {
    const form = await this.formRepository.findByIdAndOrganization(formId, organizationId);
    if (!form) {
      throw new CustomFormNotFoundError();
    }

    await this.formRepository.softDelete(formId, organizationId);

    await logActivity(
      { userId: deletedByUserId, organizationId },
      "delete",
      "forms",
      formId,
      form.name
    );

    return { success: true };
  }

  async addField(
    organizationId: string,
    formId: string,
    userId: string,
    fieldData: {
      label: string;
      key: string;
      type: string;
      required?: boolean;
      placeholder?: string | null;
      helpText?: string | null;
      options?: Array<{ label: string; value: string }> | null;
    }
  ) {
    const form = await this.formRepository.findByIdAndOrganization(formId, organizationId);
    if (!form) {
      throw new CustomFormNotFoundError();
    }

    // Get max order
    const maxOrder = form.fields.length > 0 ? Math.max(...form.fields.map((f) => f.order)) : -1;

    const field = await prisma.customFormField.create({
      data: {
        formId,
        label: fieldData.label,
        key: fieldData.key,
        type: fieldData.type as CustomFormFieldType,
        required: fieldData.required ?? false,
        placeholder: fieldData.placeholder || null,
        helpText: fieldData.helpText || null,
        options: fieldData.options || null,
        order: maxOrder + 1,
      },
    });

    await logActivity(
      { userId, organizationId },
      "create",
      "forms",
      formId,
      `Added field: ${fieldData.label}`
    );

    return field;
  }

  async updateField(
    organizationId: string,
    formId: string,
    fieldId: string,
    userId: string,
    fieldData: Partial<{
      label: string;
      type: string;
      required: boolean;
      placeholder: string | null;
      helpText: string | null;
      options: Array<{ label: string; value: string }> | null;
      order: number;
    }>
  ) {
    const form = await this.formRepository.findByIdAndOrganization(formId, organizationId);
    if (!form) {
      throw new CustomFormNotFoundError();
    }

    const field = form.fields.find((f) => f.id === fieldId);
    if (!field) {
      throw new Error("Field not found");
    }

    const updated = await prisma.customFormField.update({
      where: { id: fieldId },
      data: {
        label: fieldData.label ?? field.label,
        type: (fieldData.type ?? field.type) as CustomFormFieldType,
        required: fieldData.required ?? field.required,
        placeholder: fieldData.placeholder ?? field.placeholder,
        helpText: fieldData.helpText ?? field.helpText,
        options: fieldData.options !== undefined ? fieldData.options : field.options,
        order: fieldData.order ?? field.order,
      },
    });

    await logActivity(
      { userId, organizationId },
      "update",
      "forms",
      formId,
      `Updated field: ${field.label}`
    );

    return updated;
  }

  async deleteField(organizationId: string, formId: string, fieldId: string, userId: string) {
    const form = await this.formRepository.findByIdAndOrganization(formId, organizationId);
    if (!form) {
      throw new CustomFormNotFoundError();
    }

    const field = form.fields.find((f) => f.id === fieldId);
    if (!field) {
      throw new Error("Field not found");
    }

    await prisma.customFormField.delete({
      where: { id: fieldId },
    });

    await logActivity(
      { userId, organizationId },
      "delete",
      "forms",
      formId,
      `Deleted field: ${field.label}`
    );

    return { success: true };
  }
}
