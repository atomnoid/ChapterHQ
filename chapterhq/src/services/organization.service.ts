import { OrganizationRepository } from "@/repositories/organization.repository";
import { MemberService } from "@/services/member.service";
import { RoleService } from "@/services/role.service";
import { createOrganizationSchema } from "@/validators/organization.validator";
import type { CreateOrganizationInput } from "@/validators/organization.validator";
import { z } from "zod";

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
    private readonly roleService = new RoleService()
  ) {}

  async createOrganization(data: CreateOrganizationInput, userId: string) {
    const validatedData = createOrganizationSchema.parse(data);

    const existing = await this.repository.findBySlug(
      validatedData.slug
    );

    if (existing) {
      throw new OrganizationAlreadyExistsError();
    }

    const organization = await this.repository.create(validatedData);

    const member = await this.memberService.createMember(
      organization.id,
      userId
    );

    await this.roleService.seedDefaultRoles(organization.id);

    await this.roleService.assignOwnerRole(organization.id, member.id);

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
}