import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { InventoryService } from "@/services/inventory.service";
import { createInventoryItemSchema, inventoryQuerySchema } from "@/validators/inventory.validator";

const inventoryService = new InventoryService();

// GET /api/inventory
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "inventory:read");

    const searchParams = request.nextUrl.searchParams;
    const queryInput = inventoryQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await inventoryService.listItems(authContext.organizationId, {
      ...queryInput,
      committeeId: authContext.activeCommitteeId ?? null,
    });

    return apiResponse.success(result);
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid query parameters.");
    }
    return apiResponse.serverError();
  }
}

// POST /api/inventory
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "inventory:create");

    const body = await request.json();
    const validatedData = createInventoryItemSchema.parse(body);

    const item = await inventoryService.createItem(
      authContext.organizationId,
      {
        ...validatedData,
        committeeId: authContext.activeCommitteeId ?? null,
      },
      session.user.id
    );

    return apiResponse.created(item, "Inventory item created successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}
