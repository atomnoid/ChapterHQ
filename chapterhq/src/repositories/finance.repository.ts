import { prisma } from "@/lib/prisma";
import { FinanceRecord, TransactionType, Prisma } from "@prisma/client";

export interface CreateFinanceInput {
  organizationId: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: Date;
  description?: string;
  createdBy?: string;
  committeeId?: string | null;
}

export interface UpdateFinanceInput {
  type?: TransactionType;
  category?: string;
  amount?: number;
  date?: Date;
  description?: string;
}

export interface ListFinanceQuery {
  search?: string;
  type?: TransactionType;
  category?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  committeeId?: string | null;
}

export class FinanceRepository {
  async create(data: CreateFinanceInput): Promise<FinanceRecord> {
    return prisma.financeRecord.create({
      data: {
        organizationId: data.organizationId,
        type: data.type,
        category: data.category,
        amount: data.amount,
        date: data.date,
        description: data.description,
        createdBy: data.createdBy,
        committeeId: data.committeeId,
      },
    });
  }

  async update(id: string, organizationId: string, data: UpdateFinanceInput): Promise<FinanceRecord> {
    return prisma.financeRecord.update({
      where: { id },
      data,
    });
  }

  async findById(id: string, organizationId: string): Promise<FinanceRecord | null> {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const rec = await prisma.financeRecord.findFirst({
      where: { id, organizationId },
    });
    if (rec?.deletedAt) return null;
    return rec;
  }

  async list(organizationId: string, query: ListFinanceQuery = {}) {
    const { search, type, category, startDate, endDate, page = 1, limit = 10, committeeId } = query;
    const skip = (page - 1) * limit;

    // MongoDB Prisma bug: deletedAt: null removed from where; JS post-filter applied below.
    const where: Prisma.FinanceRecordWhereInput = {
      organizationId,
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(committeeId ? { committeeId } : {}),
      ...((startDate || endDate)
        ? {
            date: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { category: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const allItems = await prisma.financeRecord.findMany({
      where,
      orderBy: { date: "desc" },
    });

    const notDeleted = allItems.filter((r) => !r.deletedAt);
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

  async getSummary(organizationId: string, committeeId?: string | null) {
    // MongoDB Prisma bug: deletedAt: null in where clause returns no results.
    const allRecords = await prisma.financeRecord.findMany({
      where: {
        organizationId,
        ...(committeeId ? { committeeId } : {}),
      },
      select: { type: true, amount: true, deletedAt: true },
    });

    // Post-filter soft-deleted records in JS.
    const records = allRecords.filter((r) => !r.deletedAt);

    let totalIncome = 0;
    let totalExpense = 0;

    for (const record of records) {
      if (record.type === TransactionType.INCOME) {
        totalIncome += record.amount;
      } else if (record.type === TransactionType.EXPENSE) {
        totalExpense += record.amount;
      }
    }

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: records.length,
    };
  }

  async softDelete(id: string, organizationId: string): Promise<FinanceRecord> {
    return prisma.financeRecord.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
