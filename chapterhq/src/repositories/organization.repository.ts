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
}