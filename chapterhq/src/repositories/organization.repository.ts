import { prisma } from "@/lib/prisma";
import type { CreateOrganizationInput } from "@/validators/organization.validator";
import type { OrganizationStatus } from "@prisma/client";

export class OrganizationRepository {
  async create(data: CreateOrganizationInput) {
    return prisma.organization.create({
      data,
    });
  }

  async findBySlug(slug: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const org = await prisma.organization.findFirst({
      where: { slug },
    });
    if (org?.deletedAt) return null;
    return org;
  }

  async findById(id: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const org = await prisma.organization.findFirst({
      where: { id },
    });
    if (org?.deletedAt) return null;
    return org;
  }

  async getAll() {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
    });
    return orgs.filter((o) => !o.deletedAt);
  }

  async delete(id: string) {
    return prisma.organization.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async existsBySlug(slug: string, excludeId?: string) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const org = await prisma.organization.findFirst({
      where: {
        slug: { equals: slug, mode: "insensitive" },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });
    if (org?.deletedAt) return false;
    return !!org;
  }

  async update(id: string, data: { name?: string; slug?: string; description?: string; status?: OrganizationStatus }) {
    return prisma.organization.update({
      where: {
        id,
      },
      data,
    });
  }
}
