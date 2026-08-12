export type EmailTemplateTypeValue =
  | "ORGANIZATION_INVITATION"
  | "APPOINTMENT_CREATED"
  | "CERTIFICATE_ISSUED"
  | "MANUAL"
  | "EVENT_REMINDER";

export type EmailLogStatusValue = "PENDING" | "SENT" | "FAILED";

export type EmailSourceTypeValue = "INVITATION" | "MANUAL" | "APPOINTMENT" | "CERTIFICATE";

export type EmailTemplateRecord = {
  id: string;
  organizationId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  type: EmailTemplateTypeValue;
  isActive: boolean;
  archivedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EmailLogRecord = {
  id: string;
  organizationId: string;
  templateId: string | null;
  recipient: string;
  subject: string;
  type: EmailTemplateTypeValue;
  sourceType: EmailSourceTypeValue;
  sourceId: string | null;
  eventType: string | null;
  status: EmailLogStatusValue;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type EmailTemplateDelegate = {
  findFirst(args: unknown): Promise<EmailTemplateRecord | null>;
  findMany(args: unknown): Promise<EmailTemplateRecord[]>;
  create(args: unknown): Promise<EmailTemplateRecord>;
  update(args: unknown): Promise<EmailTemplateRecord>;
  updateMany(args: unknown): Promise<unknown>;
};

type EmailLogDelegate = {
  findFirst(args: unknown): Promise<EmailLogRecord | null>;
  findMany(args: unknown): Promise<Array<EmailLogRecord & { template?: { name: string } | null }>>;
  create(args: unknown): Promise<EmailLogRecord>;
  update(args: unknown): Promise<EmailLogRecord>;
};

export type EmailPrismaClient = {
  emailTemplate: EmailTemplateDelegate;
  emailLog: EmailLogDelegate;
};
