import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";
import { FinanceService } from "@/services/finance.service";
import { createFinanceSchema, financeQuerySchema } from "@/validators/finance.validator";

const financeService = new FinanceService();

// GET /api/finance
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "finance:read");

    const searchParams = request.nextUrl.searchParams;
    const queryInput = financeQuerySchema.parse({
      search: searchParams.get("search") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await financeService.listRecords(authContext.organizationId, queryInput);

    return apiResponse.success(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid query parameters.");
    }
    return apiResponse.serverError();
  }
}

// POST /api/finance
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const { context: authContext } = await requirePermission(session.user.id, "finance:create");

    const body = await request.json();
    const validatedData = createFinanceSchema.parse(body);

    const record = await financeService.createRecord(
      authContext.organizationId,
      validatedData,
      session.user.id
    );

    return apiResponse.created(record, "Finance record created successfully.");
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "PermissionDeniedError") {
      return apiResponse.forbidden();
    }
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    return apiResponse.serverError();
  }
}
