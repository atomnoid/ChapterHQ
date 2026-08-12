import { NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { apiResponse } from "@/lib/api-response";
import { auth } from "@/lib/auth";

const testEmailSchema = z.object({
  email: z.string().trim().email("A valid email address is required."),
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown Resend error.";
};

// POST /api/test-email
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      return apiResponse.serverError("Resend environment variables are not configured.");
    }

    const body = await request.json();
    const { email } = testEmailSchema.parse(body);

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: `ChapterHQ <${fromEmail}>`,
      to: email,
      subject: "ChapterHQ Email Test",
      text: "This is a test email from ChapterHQ. Resend integration is working.",
    });

    if (error) {
      return apiResponse.serverError(`Resend error: ${getErrorMessage(error)}`);
    }

    return apiResponse.success(
      { id: data?.id ?? null },
      "Test email sent successfully."
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }

    return apiResponse.serverError(`Unable to send test email: ${getErrorMessage(error)}`);
  }
}
