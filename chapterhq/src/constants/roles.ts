export const DEFAULT_ORG_ROLES = [
  { name: "President", scope: "ORGANIZATION" as const },
  { name: "Secretary", scope: "ORGANIZATION" as const },
  { name: "Treasurer", scope: "ORGANIZATION" as const },
  { name: "Member", scope: "ORGANIZATION" as const },
] as const;

export const OWNER_ROLE_NAME = "President";
