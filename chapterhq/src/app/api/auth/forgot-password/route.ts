import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthService } from "@/services/auth.service";

const authService = new AuthService();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email: string };

    await authService.preparePasswordReset(body);

    return NextResponse.json(
      {
        message:
          "If this email is registered, a password reset request has been prepared.",
      },
      {
        status: 200,
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

    return NextResponse.json(
      {
        message: "Unable to process password reset request.",
      },
      {
        status: 500,
      }
    );
  }
}