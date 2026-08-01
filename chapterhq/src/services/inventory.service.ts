import { InventoryRepository, ListInventoryQuery } from "@/repositories/inventory.repository";
import { CreateInventoryItemInput, UpdateInventoryItemInput } from "@/validators/inventory.validator";
import { logActivity } from "@/lib/audit-logger";

export class InventoryItemNotFoundError extends Error {
  constructor(message = "Inventory item not found.") {
    super(message);
    this.name = "InventoryItemNotFoundError";
  }
}

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
    actorId?: string
  ) {
    const existing = await this.getItem(id, organizationId);

    const updated = await this.inventoryRepo.update(id, organizationId, input);

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

  async getItem(id: string, organizationId: string) {
    const item = await this.inventoryRepo.findById(id, organizationId);
    if (!item) {
      throw new InventoryItemNotFoundError();
    }
    return item;
  }

  async listItems(organizationId: string, query: ListInventoryQuery = {}) {
    return this.inventoryRepo.list(organizationId, query);
  }

  async deleteItem(id: string, organizationId: string, actorId?: string) {
    const item = await this.getItem(id, organizationId);

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
