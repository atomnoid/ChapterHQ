import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { MultiOrganizationService } from "@/services/multi-organization.service";

const multiOrgService = new MultiOrganizationService();

// POST /api/organizations/switch
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const body = await request.json();
    const { organizationId } = body as { organizationId?: string };

    if (!organizationId) {
      return apiResponse.badRequest("organizationId is required.");
    }

    // Validate membership active status
    try {
      await multiOrgService.validateMembership(session.user.id, organizationId);
    } catch {
      return apiResponse.forbidden("You are not an active member of this organization.");
    }

    // Return the response containing switch confirmation.
    // Client-side NextAuth update/refresh or session update will receive the switch.
    return apiResponse.success(
      { activeOrganizationId: organizationId },
      "Active organization switched successfully."
    );
  } catch (error) {
    return apiResponse.serverError();
  }
}
