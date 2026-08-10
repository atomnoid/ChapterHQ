import { InventoryRepository, ListInventoryQuery } from "@/repositories/inventory.repository";
import { CreateInventoryItemInput as ZodCreateInput, UpdateInventoryItemInput } from "@/validators/inventory.validator";
import { logActivity } from "@/lib/audit-logger";
import { PermissionDeniedError } from "@/types/errors";
import { prisma } from "@/lib/prisma";

export class InventoryItemNotFoundError extends Error {
  constructor(message = "Inventory item not found.") {
    super(message);
    this.name = "InventoryItemNotFoundError";
  }
}

type CreateInventoryItemInput = ZodCreateInput & { committeeId?: string | null };

export class InventoryService {
  private inventoryRepo: InventoryRepository;

  constructor() {
    this.inventoryRepo = new InventoryRepository();
  }

  async createItem(
    organizationId: string,
    input: CreateInventoryItemInput,
    actorId?: string
  ) {
    if (input.committeeId) {
      // 1. Verify committee belongs to organization and is not deleted
      const committee = await prisma.committee.findFirst({
        where: { id: input.committeeId, organizationId, deletedAt: null },
      });
      if (!committee) {
        throw new PermissionDeniedError();
      }

      // 2. Check if user has access to that committee using existing rules
      if (actorId) {
        const member = await prisma.member.findFirst({
          where: { userId: actorId, organizationId, status: "ACTIVE", deletedAt: null },
        });
        if (!member) {
          throw new PermissionDeniedError();
        }

        const userRoles = await prisma.userRole.findMany({
          where: { memberId: member.id },
          include: { role: true },
        });
        const isPresident = userRoles.some(ur => ur.role.name === "President" && !ur.role.deletedAt);

        if (!isPresident) {
          // Check CommitteeMember row
          const isCM = await prisma.committeeMember.findFirst({
            where: { committeeId: input.committeeId, memberId: member.id, deletedAt: null },
          });

          // Also check Committee Head appointment (covers heads not explicitly added as members)
          const isHead = !isCM && await prisma.appointment.findFirst({
            where: {
              committeeId: input.committeeId,
              memberId: member.id,
              status: "ACTIVE",
              deletedAt: null,
              designation: {
                in: ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"],
              },
            },
          });

          if (!isCM && !isHead) {
            throw new PermissionDeniedError();
          }
        }
      }
    }

    const item = await this.inventoryRepo.create({
      organizationId,
      ...input,
    });

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "create",
        resource: "inventory",
        targetId: item.id,
        targetName: item.name,
      });
    }

    return item;
  }

  async updateItem(
    id: string,
    organizationId: string,
    input: UpdateInventoryItemInput,
    actorId?: string,
    activeCommitteeId?: string | null
  ) {
    const existing = await this.getItem(id, organizationId, activeCommitteeId);

    // Remove committeeId from input to prevent reassignment
    const { committeeId, ...updateInput } = input as any;

    const updated = await this.inventoryRepo.update(id, organizationId, updateInput);

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "update",
        resource: "inventory",
        targetId: existing.id,
        targetName: updated.name,
      });
    }

    return updated;
  }

  async getItem(id: string, organizationId: string, activeCommitteeId?: string | null) {
    const item = await this.inventoryRepo.findById(id, organizationId);
    if (!item) {
      throw new InventoryItemNotFoundError();
    }

    if (activeCommitteeId && item.committeeId !== activeCommitteeId) {
      throw new InventoryItemNotFoundError();
    }

    return item;
  }

  async listItems(organizationId: string, query: ListInventoryQuery = {}) {
    return this.inventoryRepo.list(organizationId, query);
  }

  async deleteItem(id: string, organizationId: string, actorId?: string, activeCommitteeId?: string | null) {
    const item = await this.getItem(id, organizationId, activeCommitteeId);

    const deleted = await this.inventoryRepo.softDelete(id, organizationId);

    if (actorId) {
      await logActivity({
        organizationId,
        actorId,
        action: "delete",
        resource: "inventory",
        targetId: item.id,
        targetName: item.name,
      });
    }

    return deleted;
  }
}
