export const DEFAULT_EMAIL_TEMPLATES = [
  {
    name: "Organization Invitation",
    type: "ORGANIZATION_INVITATION",
    subject: "You're invited to join {{organizationName}}",
    bodyHtml:
      "<p>Hello {{memberEmail}},</p><p>You have been invited to join {{organizationName}} as {{roleName}}.</p><p><a href=\"{{invitationUrl}}\">Accept your invitation</a></p>",
  },
  {
    name: "General Member Email",
    type: "GENERAL",
    subject: "Update from {{organizationName}}",
    bodyHtml:
      "<p>Hello {{memberName}},</p><p>This is an update from {{organizationName}}.</p><p>Regards,<br />{{organizationName}}</p>",
  },
  {
    name: "Appointment Created",
    type: "APPOINTMENT_CREATED",
    subject: "Appointment created: {{appointmentTitle}}",
    bodyHtml:
      "<p>Hello {{memberName}},</p><p>You have a new appointment in {{organizationName}}.</p><p><strong>{{appointmentTitle}}</strong><br />{{committeeName}}<br />{{appointmentDate}} {{appointmentTime}}</p>",
  },
  {
    name: "Certificate Issued",
    type: "CERTIFICATE_ISSUED",
    subject: "Your certificate from {{organizationName}} is ready",
    bodyHtml:
      "<p>Hello {{memberName}},</p><p>Your certificate has been issued by {{organizationName}}.</p><p><a href=\"{{certificateUrl}}\">View certificate</a></p>",
  },
];
