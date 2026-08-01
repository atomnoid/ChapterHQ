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
    return prisma.financeRecord.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });
  }

  async list(organizationId: string, query: ListFinanceQuery = {}) {
    const { search, type, category, startDate, endDate, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FinanceRecordWhereInput = {
      organizationId,
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
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

    const [items, total] = await Promise.all([
      prisma.financeRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
      }),
      prisma.financeRecord.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSummary(organizationId: string) {
    const records = await prisma.financeRecord.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      select: {
        type: true,
        amount: true,
      },
    });

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
