import { prisma } from "@/lib/prisma";
import type { CreateOrganizationInput } from "@/validators/organization.validator";

export class OrganizationRepository {
  async create(data: CreateOrganizationInput) {
    return prisma.organization.create({
      data,
    });
  }

  async findBySlug(slug: string) {
    return prisma.organization.findFirst({
      where: {
        deletedAt: null,
        slug,
      },
    });
  }

  async findById(id: string) {
    return prisma.organization.findFirst({
      where: {
        deletedAt: null,
        id,
      },
    });
  }

  async getAll() {
    return prisma.organization.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
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
    const org = await prisma.organization.findFirst({
      where: {
        deletedAt: null,
        slug: { equals: slug, mode: "insensitive" },
        NOT: excludeId ? { id: excludeId } : undefined,
      },
    });
    return !!org;
  }

  async update(id: string, data: { name?: string; slug?: string; status?: any }) {
    return prisma.organization.update({
      where: {
        id,
      },
      data,
    });
  }
}