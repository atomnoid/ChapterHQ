import { NextResponse } from "next/server";
import { ZodError } from "zod";

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
      return NextResponse.json(
        {
          message: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const body = (await request.json()) as {
      name: string;
      slug: string;
    };

    const organization = await organizationService.createOrganization(
      body,
      session.user.id
    );

    return NextResponse.json(
      {
        message: "Organization created successfully.",
        data: organization,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    if (error instanceof OrganizationAlreadyExistsError) {
      return NextResponse.json(
        {
          message: error.message,
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        message: "Unable to create organization.",
      },
      {
        status: 500,
      }
    );
  }
}
