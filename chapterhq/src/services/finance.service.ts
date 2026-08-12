import { FinanceRepository, ListFinanceQuery } from "@/repositories/finance.repository";
import { CreateFinanceInput as ZodCreateInput, UpdateFinanceInput } from "@/validators/finance.validator";
import { logActivity } from "@/lib/audit-logger";
import { PermissionDeniedError } from "@/types/errors";
import { prisma } from "@/lib/prisma";

export class FinanceRecordNotFoundError extends Error {
  constructor(message = "Finance record not found.") {
    super(message);
    this.name = "FinanceRecordNotFoundError";
  }
}

type CreateFinanceInput = ZodCreateInput & { committeeId?: string | null };

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
    if (input.committeeId) {
      // 1. Verify committee belongs to organization and is not deleted
      const committee = await prisma.committee.findFirst({
        where: { id: input.committeeId, organizationId },
      });
      if (!committee || committee.deletedAt) {
        throw new PermissionDeniedError();
      }

      // 2. Check if user has access to that committee using existing rules:
      //    President → always allowed
      //    CommitteeMember → allowed
      //    Committee Head (active appointment) → allowed
      if (actorId) {
        const member = await prisma.member.findFirst({
          where: { userId: actorId, organizationId, status: "ACTIVE" },
        });
        if (!member || member.deletedAt) {
          throw new PermissionDeniedError();
        }

        const userRoles = await prisma.userRole.findMany({
          where: { memberId: member.id },
          include: { role: true },
        });
        const isPresident = userRoles.some(ur => (ur.role.name === "Admin" || ur.role.name === "President") && !ur.role.deletedAt);

        if (!isPresident) {
          // Check CommitteeMember row
          const committeeMembers = await prisma.committeeMember.findMany({
            where: { committeeId: input.committeeId, memberId: member.id },
          });
          const isCM = committeeMembers.some(cm => !cm.deletedAt);

          // Also check Committee Head appointment (covers heads not explicitly added as members)
          const appointments = await prisma.appointment.findMany({
            where: {
              committeeId: input.committeeId,
              memberId: member.id,
              status: "ACTIVE",
            },
          });
          const isHead = !isCM && appointments.some(a => !a.deletedAt && ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"].includes(a.designation));

          if (!isCM && !isHead) {
            throw new PermissionDeniedError();
          }
        }
      }
    }


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
    actorId?: string,
    activeCommitteeId?: string | null
  ) {
    const record = await this.getRecord(id, organizationId, activeCommitteeId);

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

  async getRecord(id: string, organizationId: string, activeCommitteeId?: string | null) {
    const record = await this.financeRepo.findById(id, organizationId);
    if (!record) {
      throw new FinanceRecordNotFoundError();
    }

    if (activeCommitteeId && record.committeeId !== activeCommitteeId) {
      throw new FinanceRecordNotFoundError();
    }

    return record;
  }

  async listRecords(organizationId: string, query: ListFinanceQuery = {}) {
    return this.financeRepo.list(organizationId, query);
  }

  async getSummary(organizationId: string, committeeId?: string | null) {
    return this.financeRepo.getSummary(organizationId, committeeId);
  }

  async deleteRecord(id: string, organizationId: string, actorId?: string, activeCommitteeId?: string | null) {
    const record = await this.getRecord(id, organizationId, activeCommitteeId);

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
