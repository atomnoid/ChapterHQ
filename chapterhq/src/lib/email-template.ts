export type EmailTemplateVariables = Record<string, string | number | Date | null | undefined>;

const VARIABLE_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

const stringifyValue = (value: string | number | Date | null | undefined) => {
  if (value instanceof Date) return value.toLocaleDateString();
  if (value === null || value === undefined) return "";
  return String(value);
};

export function renderEmailTemplate(template: string, variables: EmailTemplateVariables) {
  return template.replace(VARIABLE_PATTERN, (_match, key: string) => stringifyValue(variables[key]));
}

export const SUPPORTED_EMAIL_VARIABLES = [
  "memberName",
  "memberEmail",
  "organizationName",
  "organizationSlug",
  "committeeName",
  "roleName",
  "invitationUrl",
  "certificateUrl",
  "eventName",
  "appointmentTitle",
  "appointmentDate",
  "appointmentTime",
];
