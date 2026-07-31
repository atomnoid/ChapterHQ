import { NextResponse } from "next/server";

export const apiResponse = {
  success<T>(data: T, message?: string) {
    return NextResponse.json(
      message ? { message, data } : data,
      { status: 200 }
    );
  },

  created<T>(data: T, message?: string) {
    return NextResponse.json(
      message ? { message, data } : data,
      { status: 201 }
    );
  },

  badRequest(message: string) {
    return NextResponse.json({ message }, { status: 400 });
  },

  unauthorized(message = "Unauthorized.") {
    return NextResponse.json({ message }, { status: 401 });
  },

  forbidden(message = "Permission denied.") {
    return NextResponse.json({ message }, { status: 403 });
  },

  notFound(message: string) {
    return NextResponse.json({ message }, { status: 404 });
  },

  conflict(message: string) {
    return NextResponse.json({ message }, { status: 409 });
  },

  serverError(message = "Internal server error.") {
    return NextResponse.json({ message }, { status: 500 });
  },
};
