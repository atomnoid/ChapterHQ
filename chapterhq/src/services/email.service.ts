import { Resend } from "resend";

import { renderEmailTemplate, type EmailTemplateVariables } from "@/lib/email-template";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EMAIL_TEMPLATES } from "@/services/email-template-defaults";
import type { EmailPrismaClient, EmailSourceTypeValue, EmailTemplateTypeValue } from "@/types/email";

type SendEmailParams = {
  organizationId: string;
  to: string | string[];
  subject: string;
  html: string;
  templateId?: string | null;
  type: EmailTemplateTypeValue;
  sourceType: EmailSourceTypeValue;
  sourceId?: string | null;
  eventType?: string | null;
};

type SendTemplateParams = Omit<SendEmailParams, "subject" | "html" | "templateId"> & {
  templateId?: string | null;
  templateType: EmailTemplateTypeValue;
  variables: EmailTemplateVariables;
};

type EmailResult = {
  success: boolean;
  providerMessageId?: string | null;
  error?: string;
  skipped?: boolean;
};

const prismaClient = prisma as unknown as typeof prisma & EmailPrismaClient;

const safeErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unknown email provider error.";
};

const hasEmailLikeShape = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getSafeResendResult = (response: { data?: { id?: string | null } | null; error?: unknown }) => ({
  providerMessageId: response.data?.id ?? null,
  error: response.error ? safeErrorMessage(response.error) : null,
});

const maskInvitationUrl = (url: string) => url.replace(/\/invite\/[^/?#]+/, "/invite/[masked]");

export class EmailService {
  private resend: Resend | null = null;

  private getResend() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
    this.resend ??= new Resend(apiKey);
    return this.resend;
  }

  private getFromAddress() {
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) throw new Error("RESEND_FROM_EMAIL is not configured.");
    const fromName = process.env.RESEND_FROM_NAME || "ChapterHQ";
    return `${fromName} <${fromEmail}>`;
  }

  private getAppUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  }

  async seedDefaultTemplates(organizationId: string) {
    for (const template of DEFAULT_EMAIL_TEMPLATES) {
      const existing = await prismaClient.emailTemplate.findFirst({
        where: { organizationId, type: template.type },
      });
      if (existing && !existing.deletedAt) continue;

      await prismaClient.emailTemplate.create({
        data: {
          organizationId,
          name: template.name,
          type: template.type,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          isActive: true,
        },
      });
    }
  }

  async ensureDefaultTemplate(organizationId: string, type: EmailTemplateTypeValue) {
    const existing = await this.getActiveTemplate(organizationId, type);
    if (existing) return existing;

    const defaultTemplate = DEFAULT_EMAIL_TEMPLATES.find((template) => template.type === type);
    if (!defaultTemplate) return null;

    const created = await prismaClient.emailTemplate.create({
      data: {
        organizationId,
        name: defaultTemplate.name,
        type: defaultTemplate.type,
        subject: defaultTemplate.subject,
        bodyHtml: defaultTemplate.bodyHtml,
        isActive: true,
      },
    });

    return created;
  }

  async getActiveTemplate(organizationId: string, type: EmailTemplateTypeValue) {
    const template = await prismaClient.emailTemplate.findFirst({
      where: { organizationId, type, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    if (template && !template.deletedAt && !template.archivedAt) return template;

    const fallback = await prismaClient.emailTemplate.findFirst({
      where: { organizationId, type },
      orderBy: { createdAt: "desc" },
    });
    if (fallback && !fallback.deletedAt && !fallback.archivedAt) return fallback;

    return null;
  }

  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    const recipients = (Array.isArray(params.to) ? params.to : [params.to]).map((recipient) => recipient.trim());
    let logId: string | null = null;
    const from = this.getFromAddress();
    const debugPrefix = params.sourceType === "INVITATION" ? "[InvitationEmailDebug]" : "[EmailDebug]";

    console.log(`${debugPrefix} EmailService started`);
    console.log(`${debugPrefix} recipient: ${recipients.join(", ")}`);
    console.log(`${debugPrefix} from: ${from}`);
    console.log(`${debugPrefix} subject: ${params.subject}`);
    console.log(`${debugPrefix} templateId: ${params.templateId ?? "none"}`);

    try {
      if (recipients.length === 0 || recipients.some((recipient) => !hasEmailLikeShape(recipient))) {
        return { success: false, error: "Email recipient is invalid." };
      }
      if (!params.subject.trim()) {
        return { success: false, error: "Email subject is required." };
      }
      if (!params.html.trim()) {
        return { success: false, error: "Email body is empty." };
      }

      if (params.sourceId && params.eventType) {
        const existing = await prismaClient.emailLog.findFirst({
          where: {
            organizationId: params.organizationId,
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            eventType: params.eventType,
            status: "SENT",
          },
        });
        if (existing) {
          return { success: true, providerMessageId: existing.providerMessageId, skipped: true };
        }
      }

      const log = await prismaClient.emailLog.create({
        data: {
          organizationId: params.organizationId,
          recipient: recipients.join(", "),
          subject: params.subject,
          templateId: params.templateId ?? undefined,
          type: params.type,
          sourceType: params.sourceType,
          sourceId: params.sourceId ?? undefined,
          eventType: params.eventType ?? undefined,
          status: "PENDING",
        },
      });
      logId = log.id;

      console.log(`${debugPrefix} calling Resend`);

      const response = await this.getResend().emails.send({
        from,
        to: recipients,
        subject: params.subject,
        html: params.html,
      });

      console.log(`${debugPrefix} Resend result:`, getSafeResendResult(response));

      if (response.error) {
        const message = safeErrorMessage(response.error);
        await prismaClient.emailLog.update({
          where: { id: log.id },
          data: { status: "FAILED", errorMessage: message },
        });
        console.error("[EmailService] Resend send failed", { sourceType: params.sourceType, sourceId: params.sourceId, message });
        return { success: false, error: message };
      }

      if (!response.data?.id) {
        const message = "Resend did not return a provider message ID.";
        await prismaClient.emailLog.update({
          where: { id: log.id },
          data: { status: "FAILED", errorMessage: message },
        });
        console.error("[EmailService] Resend send failed", { sourceType: params.sourceType, sourceId: params.sourceId, message });
        return { success: false, error: message };
      }

      await prismaClient.emailLog.update({
        where: { id: log.id },
        data: { status: "SENT", providerMessageId: response.data.id, sentAt: new Date() },
      });

      return { success: true, providerMessageId: response.data.id };
    } catch (error) {
      const message = safeErrorMessage(error);
      if (logId) {
        await prismaClient.emailLog.update({
          where: { id: logId },
          data: { status: "FAILED", errorMessage: message },
        }).catch(() => undefined);
      }
      console.error("[EmailService] send failed", { sourceType: params.sourceType, sourceId: params.sourceId, message });
      return { success: false, error: message };
    } finally {
      console.log(`${debugPrefix} send completed`);
    }
  }

  async sendTemplateEmail(params: SendTemplateParams): Promise<EmailResult> {
    const template = params.templateId
      ? await prismaClient.emailTemplate.findFirst({ where: { id: params.templateId, organizationId: params.organizationId } })
      : await this.ensureDefaultTemplate(params.organizationId, params.templateType);
    const debugPrefix = params.sourceType === "INVITATION" ? "[InvitationEmailDebug]" : "[EmailDebug]";

    if (!template || template.deletedAt || template.archivedAt) {
      console.error(`${debugPrefix} template unavailable`, { templateId: params.templateId ?? null, templateType: params.templateType });
      return { success: false, error: "Please create or select an email template before sending." };
    }

    console.log(`${debugPrefix} template loaded: ${template.name}`);

    const renderedSubject = renderEmailTemplate(template.subject, params.variables);
    const renderedHtml = renderEmailTemplate(template.bodyHtml, params.variables);

    if (!renderedSubject.trim()) {
      return { success: false, error: "Invitation email template subject is empty." };
    }
    if (!renderedHtml.trim()) {
      return { success: false, error: "Invitation email template body is empty." };
    }

    console.log(`${debugPrefix} template rendered`);

    return this.sendEmail({
      ...params,
      templateId: template.id,
      type: params.templateType,
      subject: renderedSubject,
      html: renderedHtml,
    });
  }

  async sendInvitationEmail(params: {
    organizationId: string;
    invitationId: string;
    email: string;
    token: string;
    templateId?: string | null;
    variables?: EmailTemplateVariables;
  }) {
    const invitationUrl = `${this.getAppUrl()}/invite/${params.token}`;
    console.log(`[InvitationEmailDebug] invitation URL: ${maskInvitationUrl(invitationUrl)}`);

    return this.sendTemplateEmail({
      organizationId: params.organizationId,
      to: params.email,
      templateId: params.templateId,
      templateType: "ORGANIZATION_INVITATION",
      type: "ORGANIZATION_INVITATION",
      sourceType: "INVITATION",
      sourceId: params.invitationId,
      eventType: "INVITATION_SENT",
      variables: {
        memberEmail: params.email,
        invitationUrl,
        ...params.variables,
      },
    });
  }

  async sendAppointmentEmail(organizationId: string, appointmentId: string) {
    const appointment = await prismaClient.appointment.findFirst({
      where: { id: appointmentId, organizationId },
      include: { member: { include: { user: true, organization: true } }, committee: true },
    });
    if (!appointment || appointment.deletedAt) return { success: false, error: "Appointment not found." };

    return this.sendTemplateEmail({
      organizationId,
      to: appointment.member.user.email,
      templateType: "APPOINTMENT_CREATED",
      type: "APPOINTMENT_CREATED",
      sourceType: "APPOINTMENT",
      sourceId: appointment.id,
      eventType: "APPOINTMENT_CREATED",
      variables: {
        memberName: appointment.member.user.name,
        memberEmail: appointment.member.user.email,
        organizationName: appointment.member.organization.name,
        organizationSlug: appointment.member.organization.slug,
        committeeName: appointment.committee.name,
        appointmentTitle: appointment.designation,
        appointmentDate: appointment.startDate,
        appointmentTime: appointment.startDate instanceof Date ? appointment.startDate.toLocaleTimeString() : "",
      },
    });
  }

  async sendCertificateEmail(organizationId: string, certificateId: string) {
    const certificate = await prismaClient.certificate.findFirst({
      where: { id: certificateId, organizationId },
      include: { member: { include: { user: true, organization: true } } },
    });
    if (!certificate || certificate.deletedAt) return { success: false, error: "Certificate not found." };

    return this.sendTemplateEmail({
      organizationId,
      to: certificate.member.user.email,
      templateType: "CERTIFICATE_ISSUED",
      type: "CERTIFICATE_ISSUED",
      sourceType: "CERTIFICATE",
      sourceId: certificate.id,
      eventType: "CERTIFICATE_ISSUED",
      variables: {
        memberName: certificate.member.user.name,
        memberEmail: certificate.member.user.email,
        organizationName: certificate.member.organization.name,
        organizationSlug: certificate.member.organization.slug,
        certificateUrl: certificate.certificateUrl ?? "",
      },
    });
  }
}
