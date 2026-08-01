import { FinanceRepository, ListFinanceQuery } from "@/repositories/finance.repository";
import { CreateFinanceInput, UpdateFinanceInput } from "@/validators/finance.validator";
import { logActivity } from "@/lib/audit-logger";

export class FinanceRecordNotFoundError extends Error {
  constructor(message = "Finance record not found.") {
    super(message);
    this.name = "FinanceRecordNotFoundError";
  }
}

export class FinanceService {
  private financeRepo: FinanceRepository;

  constructor() {
    this.financeRepo = new FinanceRepository();
  }

  async createRecord(
    organizationId: string,
    input: CreateFinanceInput,
    actorId?: string
  ) {
    const record = await this.financeRepo.create({
      organizationId,
      ...input,
      createdBy: actorId,
    });

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "create",
        resource: "finance",
        targetId: record.id,
        targetName: `${record.type}: ${record.category} (${record.amount})`,
      });
    }

    return record;
  }

  async updateRecord(
    id: string,
    organizationId: string,
    input: UpdateFinanceInput,
    actorId?: string
  ) {
    const record = await this.getRecord(id, organizationId);

    const updated = await this.financeRepo.update(id, organizationId, input);

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "update",
        resource: "finance",
        targetId: record.id,
        targetName: `${updated.type}: ${updated.category} (${updated.amount})`,
      });
    }

    return updated;
  }

  async getRecord(id: string, organizationId: string) {
    const record = await this.financeRepo.findById(id, organizationId);
    if (!record) {
      throw new FinanceRecordNotFoundError();
    }
    return record;
  }

  async listRecords(organizationId: string, query: ListFinanceQuery = {}) {
    return this.financeRepo.list(organizationId, query);
  }

  async getSummary(organizationId: string) {
    return this.financeRepo.getSummary(organizationId);
  }

  async deleteRecord(id: string, organizationId: string, actorId?: string) {
    const record = await this.getRecord(id, organizationId);

    const deleted = await this.financeRepo.softDelete(id, organizationId);

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "delete",
        resource: "finance",
        targetId: record.id,
        targetName: `${record.type}: ${record.category} (${record.amount})`,
      });
    }

    return deleted;
  }
}
