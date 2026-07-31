import { ZodError } from "zod";
import { apiResponse } from "@/lib/api-response";

import { auth } from "@/lib/auth";
import {
  OrganizationAlreadyExistsError,
  OrganizationService,
} from "@/services/organization.service";

const organizationService = new OrganizationService();

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiResponse.unauthorized();
    }

    const body = (await request.json()) as {
      name: string;
      slug: string;
    };

    const organization = await organizationService.createOrganization(
      body,
      session.user.id
    );

    return apiResponse.created(organization, "Organization created successfully.");
  } catch (error) {
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }

    if (error instanceof OrganizationAlreadyExistsError) {
      return apiResponse.conflict(error.message);
    }

    return apiResponse.serverError("Unable to create organization.");
  }
}
