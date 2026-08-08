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
  committeeId?: string | null;
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
  committeeId?: string | null;
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
        committeeId: data.committeeId,
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
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId },
    });
    if (item?.deletedAt) return null;
    return item;
  }

  async list(organizationId: string, query: ListInventoryQuery = {}) {
    const { search, category, status, page = 1, limit = 10, committeeId } = query;
    const skip = (page - 1) * limit;

    // MongoDB Prisma bug: deletedAt: null removed from where; JS post-filter applied below.
    const where: Prisma.InventoryItemWhereInput = {
      organizationId,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(committeeId ? { committeeId } : {}),
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

    const allItems = await prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const notDeleted = allItems.filter((i) => !i.deletedAt);
    const total = notDeleted.length;
    const items = notDeleted.slice(skip, skip + limit);

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
