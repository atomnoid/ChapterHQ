import { prisma } from "@/lib/prisma";
import { InventoryItem, InventoryStatus, Prisma } from "@prisma/client";

export interface CreateInventoryItemInput {
  organizationId: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  location?: string;
  status?: InventoryStatus;
}

export interface UpdateInventoryItemInput {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  location?: string;
  status?: InventoryStatus;
}

export interface ListInventoryQuery {
  search?: string;
  category?: string;
  status?: InventoryStatus;
  page?: number;
  limit?: number;
}

export class InventoryRepository {
  async create(data: CreateInventoryItemInput): Promise<InventoryItem> {
    return prisma.inventoryItem.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        category: data.category,
        quantity: data.quantity ?? 0,
        unit: data.unit,
        location: data.location,
        status: data.status ?? InventoryStatus.IN_STOCK,
      },
    });
  }

  async update(id: string, organizationId: string, data: UpdateInventoryItemInput): Promise<InventoryItem> {
    return prisma.inventoryItem.update({
      where: { id },
      data,
    });
  }

  async findById(id: string, organizationId: string): Promise<InventoryItem | null> {
    return prisma.inventoryItem.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  async list(organizationId: string, query: ListInventoryQuery = {}) {
    const { search, category, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {
      organizationId,
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async softDelete(id: string, organizationId: string): Promise<InventoryItem> {
    return prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
