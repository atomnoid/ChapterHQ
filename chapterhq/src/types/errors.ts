export class PermissionDeniedError extends Error {
  constructor() {
    super("Permission denied.");
    this.name = "PermissionDeniedError";
  }
}

export class PermissionNotFoundError extends Error {
  constructor(permission: string) {
    super(`Permission "${permission}" not found.`);
    this.name = "PermissionNotFoundError";
  }
}

export class DuplicateRoleAssignmentError extends Error {
  constructor() {
    super("Role is already assigned to this user.");
    this.name = "DuplicateRoleAssignmentError";
  }
}
