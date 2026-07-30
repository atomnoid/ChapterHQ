import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AuthEmailAlreadyExistsError,
  AuthService,
} from "@/services/auth.service";

const authService = new AuthService();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
    };

    await authService.signup(body);

    return NextResponse.json(
      {
        message: "Account created successfully.",
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

    if (error instanceof AuthEmailAlreadyExistsError) {
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
        message: "Unable to create account.",
      },
      {
        status: 500,
      }
    );
  }
}