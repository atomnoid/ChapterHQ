import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  OnboardingBootstrapError,
  OnboardingEmailAlreadyExistsError,
  OnboardingOrganizationAlreadyExistsError,
  OnboardingService,
} from "@/services/onboarding.service";

const onboardingService = new OnboardingService();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await onboardingService.createOnboarding(body);

    return NextResponse.json(
      {
        message: "Onboarding completed successfully.",
        organizationId: result.organization.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { message: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    if (error instanceof OnboardingEmailAlreadyExistsError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    if (error instanceof OnboardingOrganizationAlreadyExistsError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    if (error instanceof OnboardingBootstrapError) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(
        { message: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Unable to complete onboarding." }, { status: 500 });
  }
}
