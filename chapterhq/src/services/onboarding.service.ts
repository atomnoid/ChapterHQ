import { randomBytes, scryptSync } from "crypto";

import { ALL_PERMISSIONS } from "@/constants/permissions";
import { DEFAULT_ORG_ROLES } from "@/constants/roles";
import { prisma } from "@/lib/prisma";
import { OrganizationRepository } from "@/repositories/organization.repository";
import { UserRepository } from "@/repositories/user.repository";
import { onboardingSchema, type OnboardingInput } from "@/validators/onboarding.validator";

const PASSWORD_HASH_PREFIX = "scrypt";
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;

export class OnboardingEmailAlreadyExistsError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "OnboardingEmailAlreadyExistsError";
  }
}

export class OnboardingOrganizationAlreadyExistsError extends Error {
  constructor() {
    super("Organization slug already exists.");
    this.name = "OnboardingOrganizationAlreadyExistsError";
  }
}

export class OnboardingBootstrapError extends Error {
  constructor(step: string) {
    super(`Onboarding bootstrap failed at: ${step}`);
    this.name = "OnboardingBootstrapError";
  }
}

export class OnboardingService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly organizationRepository = new OrganizationRepository()
  ) {}

  async createOnboarding(input: OnboardingInput) {
    const data = onboardingSchema.parse(input);

    const existingUser = await this.userRepository.findByEmail(data.superAdminEmail);
    if (existingUser) {
      throw new OnboardingEmailAlreadyExistsError();
    }

    const slugExists = await this.organizationRepository.existsBySlug(data.organizationSlug);
    if (slugExists) {
      throw new OnboardingOrganizationAlreadyExistsError();
    }

    const password = this.hashPassword(data.superAdminPassword);
    const permissionPayloads = ALL_PERMISSIONS.map((permission) => {
      const [resource, action] = permission.split(":");
      return { resource, action };
    });

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.superAdminName,
          email: data.superAdminEmail,
          password,
          authProvider: "credentials",
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: data.organizationName,
          slug: data.organizationSlug,
          description: data.organizationDescription ?? undefined,
        },
      });

      const member = await tx.member.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          status: "ACTIVE",
        },
      });

      console.log("[onboarding] member created:", member.id, "userId:", member.userId);

      const roles: Awaited<ReturnType<typeof tx.role.create>>[] = [];
      for (const role of DEFAULT_ORG_ROLES) {
        const created = await tx.role.create({
          data: {
            organizationId: organization.id,
            name: role.name,
            scope: role.scope,
          },
        });
        roles.push(created);
      }

      const missingRoles = DEFAULT_ORG_ROLES.map((role) => role.name).filter(
        (roleName) => !roles.some((role) => role.name === roleName)
      );

      if (missingRoles.length > 0) {
        console.error("[onboarding] Missing role record(s):", missingRoles.join(", "));
        throw new OnboardingBootstrapError(`role:${missingRoles[0]}`);
      }

      const existingPermissions = await tx.permission.findMany({
        where: {
          OR: permissionPayloads.map((permission) => ({
            resource: permission.resource,
            action: permission.action,
          })),
        },
      });

      const permissionsToCreate = permissionPayloads.filter(
        (permission) =>
          !existingPermissions.some(
            (record) => record.resource === permission.resource && record.action === permission.action
          )
      );

      if (permissionsToCreate.length > 0) {
        await tx.permission.createMany({
          data: permissionsToCreate,
        });
      }

      const permissions = await tx.permission.findMany({
        where: {
          OR: permissionPayloads.map((permission) => ({
            resource: permission.resource,
            action: permission.action,
          })),
        },
      });
      const missingPermissions = permissionPayloads.filter(
        (permission) =>
          !permissions.some(
            (record) => record.resource === permission.resource && record.action === permission.action
          )
      );

      if (missingPermissions.length > 0) {
        console.error(
          "[onboarding] Missing permission record(s):",
          missingPermissions.map((permission) => `${permission.resource}:${permission.action}`).join(", ")
        );
        throw new OnboardingBootstrapError(`permission:${missingPermissions[0].resource}:${missingPermissions[0].action}`);
      }

      const presidentRole = roles.find((role) => role.name === "President");
      if (!presidentRole) {
        console.error("[onboarding] Missing role record: President");
        throw new OnboardingBootstrapError("role:President");
      }

      const rolePermissions = permissions.map((permission) => ({
        roleId: presidentRole.id,
        permissionId: permission.id,
      }));

      await tx.rolePermission.createMany({
        data: rolePermissions,
      });

      const presidentMappings = await tx.rolePermission.findMany({
        where: { roleId: presidentRole.id },
      });

      if (presidentMappings.length < permissions.length) {
        console.error("[onboarding] Missing role-permission mapping record(s) for President");
        throw new OnboardingBootstrapError("rolePermission:President");
      }

      const userRole = await tx.userRole.create({
        data: {
          memberId: member.id,
          roleId: presidentRole.id,
        },
      });

      console.log("[onboarding] transaction complete — user:", user.id, "org:", organization.id, "member:", member.id, "userRole:", userRole.id);
      return { user, organization, member, userRole };
    });
  }

  private hashPassword(password: string) {
    const salt = randomBytes(PASSWORD_SALT_BYTES).toString("hex");
    const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

    return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey}`;
  }
}
