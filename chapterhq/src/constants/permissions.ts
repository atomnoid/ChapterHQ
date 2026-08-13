export const RESOURCES = [
  "members",
  "roles",
  "dashboard",
  "committees",
  "appointments",
  "societies",
  "events",
  "registrations",
  "attendance",
  "volunteer-hours",
  "certificates",
  "announcements",
  "documents",
  "inventory",
  "finance",
  "reports",
  "audit-logs",
  "website",
  "notifications",
  "settings"
] as const;

export const ACTIONS = ["create", "read", "update", "delete", "assign", "remove"] as const;

export type Resource = typeof RESOURCES[number];
export type Action = typeof ACTIONS[number];
export type PermissionString = `${Resource}:${Action}`;

// Helper to generate all combinations
export const ALL_PERMISSIONS: PermissionString[] = RESOURCES.flatMap(res =>
  ACTIONS.map(act => `${res}:${act}` as PermissionString)
);

// Mappings for non-President roles
export const SECRETARY_RESOURCES: Resource[] = [
  "members",
  "committees",
  "appointments",
  "events",
  "registrations",
  "attendance",
  "announcements",
  "documents"
];

export const TREASURER_RESOURCES: Resource[] = [
  "finance",
  "inventory",
  "reports"
];
