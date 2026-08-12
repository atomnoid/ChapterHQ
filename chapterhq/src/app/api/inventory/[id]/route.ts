import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { InventoryService, InventoryItemNotFoundError } from "@/services/inventory.service";
import { updateInventoryItemSchema } from "@/validators/inventory.validator";

const inventoryService = new InventoryService();

// GET /api/inventory/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "inventory:read");

    const { id } = await params;
    const item = await inventoryService.getItem(id, authContext.organizationId, authContext.activeCommitteeId);

    return apiResponse.success(item);
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof InventoryItemNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// PATCH /api/inventory/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "inventory:update");

    const body = await request.json();
    const validatedData = updateInventoryItemSchema.parse(body);

    const { id } = await params;
    const updated = await inventoryService.updateItem(
      id,
      authContext.organizationId,
      validatedData,
      session.user.id,
      authContext.activeCommitteeId
    );

    return apiResponse.success(updated, "Inventory item updated successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof InventoryItemNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}

// DELETE /api/inventory/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "inventory:delete");

    const { id } = await params;
    await inventoryService.deleteItem(id, authContext.organizationId, session.user.id, authContext.activeCommitteeId);

    return apiResponse.success(null, "Inventory item deleted successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof InventoryItemNotFoundError) {
      return apiResponse.notFound(error.message);
    }
    return apiResponse.serverError();
  }
}
