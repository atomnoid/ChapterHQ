import { OrganizationRepository } from "@/repositories/organization.repository";
import { MemberService } from "@/services/member.service";
import { RoleService } from "@/services/role.service";
import { PermissionService } from "@/services/permission/permission.service";
import { createOrganizationSchema } from "@/validators/organization.validator";
import type { CreateOrganizationInput } from "@/validators/organization.validator";
import { z } from "zod";
import { logActivity } from "@/lib/audit-logger";
import { OrganizationStatus } from "@prisma/client";
import { EmailService } from "@/services/email.service";

const organizationIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{24}$/i, "Invalid organization id.");

const organizationSlugSchema = z
  .string()
  .trim()
  .min(1, "Organization slug is required.");

export class OrganizationAlreadyExistsError extends Error {
  constructor() {
    super("Organization slug already exists.");
    this.name = "OrganizationAlreadyExistsError";
  }
}

export class OrganizationNotFoundError extends Error {
  constructor() {
    super("Organization not found.");
    this.name = "OrganizationNotFoundError";
  }
}

export class OrganizationService {
  constructor(
    private readonly repository = new OrganizationRepository(),
    private readonly memberService = new MemberService(),
    private readonly roleService = new RoleService(),
    private readonly permissionService = new PermissionService(),
    private readonly emailService = new EmailService()
  ) {}

  async createOrganization(data: CreateOrganizationInput, userId: string) {
    const validatedData = createOrganizationSchema.parse(data);

    const existing = await this.repository.findBySlug(
      validatedData.slug
    );

    if (existing) {
      throw new OrganizationAlreadyExistsError();
    }

    const { prisma } = await import("@/lib/prisma");
    const { ALL_PERMISSIONS } = await import("@/constants/permissions");
    const { randomBytes } = await import("crypto");

    const organization = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const org = await tx.organization.create({
        data: {
          name: validatedData.name,
          slug: validatedData.slug,
          description: validatedData.description ?? undefined,
        },
      });

      // 2. Create Member
      const member = await tx.member.create({
        data: {
          organizationId: org.id,
          userId,
          status: "ACTIVE",
        },
      });

      // 3. Create Admin Role
      const adminRole = await tx.role.create({
        data: {
          id: randomBytes(12).toString("hex"),
          organizationId: org.id,
          name: "Admin",
          scope: "ORGANIZATION",
        },
      });

      // 4. Assign Admin Role to Member
      await tx.userRole.create({
        data: {
          memberId: member.id,
          roleId: adminRole.id,
        },
      });

      // 5. Seed Permissions & Mappings
      const permissionObjects = ALL_PERMISSIONS.map(p => {
        const [resource, action] = p.split(":");
        return { resource, action };
      });

      const existingPermissions = await tx.permission.findMany({
        where: {
          OR: permissionObjects.map((p) => ({
            resource: p.resource,
            action: p.action,
          })),
        },
      });

      const permissionsToCreate = permissionObjects.filter(
        (p) => !existingPermissions.some(
          (ep) => ep.resource === p.resource && ep.action === p.action
        )
      );

      if (permissionsToCreate.length > 0) {
        await tx.permission.createMany({
          data: permissionsToCreate.map(p => ({
            id: randomBytes(12).toString("hex"),
            resource: p.resource,
            action: p.action,
          })),
        });
      }

      const allPermissions = await tx.permission.findMany({
        where: {
          OR: permissionObjects.map((p) => ({
            resource: p.resource,
            action: p.action,
          })),
        },
      });

      const rolePermissions = allPermissions.map((permission) => ({
        id: randomBytes(12).toString("hex"),
        roleId: adminRole.id,
        permissionId: permission.id,
      }));

      await tx.rolePermission.createMany({
        data: rolePermissions,
      });

      return org;
    });

    await logActivity(
      { userId, organizationId: organization.id },
      "create",
      "organization",
      organization.id,
      organization.name
    );

    await this.emailService.seedDefaultTemplates(organization.id);

    return organization;
  }

  async getOrganization(slug: string) {
    const validatedSlug = organizationSlugSchema.parse(slug);

    return this.repository.findBySlug(validatedSlug);
  }

  async getOrganizationById(id: string) {
    const validatedId = organizationIdSchema.parse(id);

    return this.repository.findById(validatedId);
  }

  async getOrganizations() {
    return this.repository.getAll();
  }

  async deleteOrganization(id: string) {
    const validatedId = organizationIdSchema.parse(id);
    const existing = await this.repository.findById(validatedId);

    if (!existing) {
      throw new OrganizationNotFoundError();
    }

    return this.repository.delete(validatedId);
  }

  async updateSettings(id: string, data: { name?: string; slug?: string; description?: string; status?: OrganizationStatus }, userId?: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new OrganizationNotFoundError();
    }

    if (data.slug) {
      const slugExists = await this.repository.existsBySlug(data.slug, id);
      if (slugExists) {
        throw new OrganizationAlreadyExistsError();
      }
    }

    const updated = await this.repository.update(id, data);

    if (userId) {
      await logActivity(
        { userId, organizationId: id },
        "update",
        "organization",
        id,
        updated.name,
        data
      );
    }

    return updated;
  }
}
