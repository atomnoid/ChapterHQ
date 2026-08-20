import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-logger";
import { CustomFormSubmissionRepository } from "@/repositories/custom-form-submission.repository";
import { CustomFormRepository } from "@/repositories/custom-form.repository";
import { MemberRepository } from "@/repositories/member.repository";
import type { SubmitCustomFormInput } from "@/validators/custom-form.validator";

export class FormSubmissionNotFoundError extends Error {
  constructor() {
    super("Form submission not found or you do not have permission to access it.");
    this.name = "FormSubmissionNotFoundError";
  }
}

export class CustomFormSubmissionService {
  constructor(
    private readonly submissionRepository = new CustomFormSubmissionRepository(),
    private readonly formRepository = new CustomFormRepository(),
    private readonly memberRepository = new MemberRepository()
  ) {}

  async submitForm(
    organizationId: string,
    formId: string,
    memberId: string,
    userId: string,
    input: SubmitCustomFormInput
  ) {
    // Verify form exists
    const form = await this.formRepository.findByIdAndOrganization(formId, organizationId);
    if (!form) {
      throw new Error("Form not found");
    }

    // Verify member exists
    const member = await this.memberRepository.findByIdAndOrganization(memberId, organizationId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Verify the userId matches the member's userId (security check)
    if (member.userId !== userId) {
      throw new Error("User does not have permission to submit this form for this member");
    }

    // Validate answers against form fields
    const fieldMap = new Map(form.fields.map((f) => [f.key, f]));
    const validatedAnswers: Array<{ fieldId: string; value: string | null }> = [];

    for (const field of form.fields) {
      const answerValue = input.answers[field.key];

      // Check required fields
      if (field.required) {
        if (answerValue === null || answerValue === undefined || answerValue === "") {
          throw new Error(`Field "${field.label}" is required`);
        }

        // Handle array values (for checkboxes)
        if (Array.isArray(answerValue) && answerValue.length === 0) {
          throw new Error(`Field "${field.label}" is required`);
        }
      }

      // Type-specific validation
      if (answerValue !== null && answerValue !== undefined && answerValue !== "") {
        let serializedValue: string | null = null;

        switch (field.type) {
          case "EMAIL": {
            const emailStr = String(answerValue);
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
              throw new Error(`"${field.label}" must be a valid email address`);
            }
            serializedValue = emailStr;
            break;
          }
          case "PHONE": {
            const phoneStr = String(answerValue);
            if (!/^[\d\-\+\(\)\s]+$/.test(phoneStr)) {
              throw new Error(`"${field.label}" must be a valid phone number`);
            }
            serializedValue = phoneStr;
            break;
          }
          case "NUMBER": {
            const numStr = String(answerValue);
            if (Number.isNaN(parseFloat(numStr))) {
              throw new Error(`"${field.label}" must be a valid number`);
            }
            serializedValue = numStr;
            break;
          }
          case "DATE": {
            const dateStr = String(answerValue);
            const date = new Date(dateStr);
            if (Number.isNaN(date.getTime())) {
              throw new Error(`"${field.label}" must be a valid date`);
            }
            serializedValue = dateStr;
            break;
          }
          case "DROPDOWN":
          case "RADIO": {
            const optionValue = String(answerValue);
            const validOption = (field.options as any[])?.some(
              (opt) => opt.value === optionValue
            );
            if (!validOption) {
              throw new Error(`"${field.label}" contains an invalid selection`);
            }
            serializedValue = optionValue;
            break;
          }
          case "CHECKBOX": {
            if (Array.isArray(answerValue)) {
              const validOptions = (field.options as any[])?.map((opt) => opt.value) || [];
              const invalidOption = answerValue.some((v) => !validOptions.includes(v));
              if (invalidOption) {
                throw new Error(`"${field.label}" contains invalid selections`);
              }
              serializedValue = JSON.stringify(answerValue);
            } else {
              serializedValue = String(answerValue);
            }
            break;
          }
          case "YES_NO": {
            const boolValue = String(answerValue).toLowerCase();
            if (!["yes", "no", "true", "false"].includes(boolValue)) {
              throw new Error(`"${field.label}" must be Yes or No`);
            }
            serializedValue = boolValue;
            break;
          }
          default:
            serializedValue = String(answerValue);
        }

        validatedAnswers.push({
          fieldId: field.id,
          value: serializedValue,
        });
      } else {
        validatedAnswers.push({
          fieldId: field.id,
          value: null,
        });
      }
    }

    // Check if member already submitted this form
    const existing = await this.submissionRepository.findByFormAndMember(formId, memberId, organizationId);
    if (existing) {
      // Update existing submission
      const submission = await prisma.customFormSubmission.update({
        where: { id: existing.id },
        data: {
          answers: {
            deleteMany: {},
            create: validatedAnswers.map((answer) => ({
              fieldId: answer.fieldId,
              value: answer.value,
            })),
          },
        },
        include: {
          answers: {
            include: {
              field: true,
            },
          },
        },
      });

      await logActivity(
        { userId, organizationId },
        "update",
        "forms-submissions",
        submission.id,
        `Updated submission for ${member.user?.name || member.user?.email}`
      );

      return { submission, isNew: false };
    }

    // Create new submission
    const submission = await this.submissionRepository.create({
      formId,
      organizationId,
      memberId,
      userId,
      answers: validatedAnswers,
    });

    await logActivity(
      { userId, organizationId },
      "create",
      "forms-submissions",
      submission.id,
      `${member.user?.name || member.user?.email} submitted form: ${form.name}`
    );

    return { submission, isNew: true };
  }

  async getSubmission(organizationId: string, formId: string, submissionId: string) {
    const submission = await this.submissionRepository.findByIdAndOrganization(
      submissionId,
      organizationId,
      formId
    );

    if (!submission) {
      throw new FormSubmissionNotFoundError();
    }

    return submission;
  }

  async listSubmissions(
    organizationId: string,
    formId: string,
    options?: { skip?: number; take?: number; memberIds?: string[] }
  ) {
    // Verify form exists
    const form = await this.formRepository.findByIdAndOrganization(formId, organizationId);
    if (!form) {
      throw new Error("Form not found");
    }

    return this.submissionRepository.listByForm({
      organizationId,
      formId,
      skip: options?.skip,
      take: options?.take,
      memberIds: options?.memberIds,
    });
  }

  async getMemberRequiredForms(organizationId: string, memberId: string) {
    // Get the member's active committee memberships so we can include committee-specific forms
    const committeeMembers = await prisma.committeeMember.findMany({
      where: { memberId },
      select: { committeeId: true, deletedAt: true },
    });
    const activeCommitteeIds = committeeMembers
      .filter((cm) => !cm.deletedAt)
      .map((cm) => cm.committeeId);

    // Get all required active forms: global (no committee) + matching committee forms
    const requiredForms = await this.formRepository.findRequiredActiveFormsByOrganization(
      organizationId,
      activeCommitteeIds
    );

    if (requiredForms.length === 0) {
      return {
        requiredForms: [],
        completedForms: [],
        incompleteRequired: [],
      };
    }

    // Get member's submissions
    const submissions = await this.submissionRepository.listByMemberAndOrganization(
      memberId,
      organizationId
    );
    const completedFormIds = new Set(submissions.map((s) => s.formId));

    const incompleteRequired = requiredForms.filter((form) => !completedFormIds.has(form.id));

    return {
      requiredForms,
      completedForms: requiredForms.filter((form) => completedFormIds.has(form.id)),
      incompleteRequired,
    };
  }

  async isOnboardingComplete(organizationId: string, memberId: string): Promise<boolean> {
    const result = await this.getMemberRequiredForms(organizationId, memberId);
    return result.incompleteRequired.length === 0;
  }

  async exportSubmissionsAsCSV(
    organizationId: string,
    formId: string,
    selectedSubmissionIds?: string[]
  ): Promise<string> {
    // Verify form exists
    const form = await this.formRepository.findByIdAndOrganization(formId, organizationId);
    if (!form) {
      throw new Error("Form not found");
    }

    // Get submissions
    let submissions: any[];
    if (selectedSubmissionIds && selectedSubmissionIds.length > 0) {
      // Fetch only selected submissions and verify they belong to this form/org
      submissions = await Promise.all(
        selectedSubmissionIds.map((id) =>
          prisma.customFormSubmission.findFirst({
            where: {
              id,
              formId,
              organizationId,
            },
            include: {
              answers: {
                include: {
                  field: true,
                },
              },
            },
          })
        )
      );
      submissions = submissions.filter((s) => s !== null);
    } else {
      // Get all submissions for the form
      const result = await this.submissionRepository.listByForm({
        organizationId,
        formId,
      });
      submissions = result.submissions;
    }

    // Build CSV
    const headers = ["Member Name", "Member Email", "Submission Date"];
    const fieldKeys = form.fields.map((f) => f.label);
    const allHeaders = [...headers, ...fieldKeys];

    // Escape CSV value
    const escapeCSVValue = (value: string | null | undefined): string => {
      if (!value) return "";
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Build rows
    const rows: string[] = [allHeaders.map(escapeCSVValue).join(",")];

    for (const submission of submissions) {
      const answerMap = new Map<string, string | null | undefined>(
        submission.answers.map((a: { field: { key: string }; value: string | null }) => [a.field.key, a.value])
      );

      // Get member info
      const member = await this.memberRepository.findByIdAndOrganization(
        submission.memberId,
        organizationId
      );

      const row: string[] = [
        escapeCSVValue(member?.user?.name || ""),
        escapeCSVValue(member?.user?.email || ""),
        escapeCSVValue(submission.submittedAt.toISOString()),
      ];

      // Add field values in order
      for (const field of form.fields) {
        const value = answerMap.get(field.key);
        row.push(escapeCSVValue(value));
      }

      rows.push(row.join(","));
    }

    return rows.join("\n");
  }
}
