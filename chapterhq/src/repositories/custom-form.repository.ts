import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface CreateCustomFormData {
  organizationId: string;
  name: string;
  description?: string | null;
  required: boolean;
  createdBy: string;
}

interface UpdateCustomFormData {
  name?: string;
  description?: string | null;
  status?: "ACTIVE" | "INACTIVE";
  required?: boolean;
}

export class CustomFormRepository {
  async create(data: CreateCustomFormData) {
    return prisma.customForm.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description || null,
        required: data.required,
        createdBy: data.createdBy,
        status: "ACTIVE",
      },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async findByIdAndOrganization(id: string, organizationId: string) {
    const form = await prisma.customForm.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (form?.deletedAt) return null;
    return form;
  }

  async listByOrganization(
    organizationId: string,
    options?: { status?: "ACTIVE" | "INACTIVE"; required?: boolean }
  ) {
    const whereClause: Prisma.CustomFormWhereInput = {
      organizationId,
    };

    if (options?.status) {
      whereClause.status = options.status;
    }

    if (options?.required !== undefined) {
      whereClause.required = options.required;
    }

    // MongoDB Prisma bug: deletedAt: null in where clause returns no results
    // Fetch without filter and post-filter in JS
    const forms = await prisma.customForm.findMany({
      where: whereClause,
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return forms.filter((f) => !f.deletedAt);
  }

  async update(id: string, organizationId: string, data: UpdateCustomFormData) {
    const form = await this.findByIdAndOrganization(id, organizationId);
    if (!form) return null;

    return prisma.customForm.update({
      where: { id },
      data: {
        name: data.name ?? form.name,
        description: data.description !== undefined ? data.description : form.description,
        status: data.status ?? form.status,
        required: data.required ?? form.required,
      },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async softDelete(id: string, organizationId: string) {
    const form = await this.findByIdAndOrganization(id, organizationId);
    if (!form) return null;

    return prisma.customForm.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findRequiredActiveFormsByOrganization(organizationId: string) {
    const forms = await prisma.customForm.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        required: true,
      },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return forms.filter((f) => !f.deletedAt);
  }
}
