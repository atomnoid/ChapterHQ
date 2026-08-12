import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z, ZodError } from "zod";

import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permission-enforcer";

const diagnosticEmailSchema = z.object({
  email: z.string().trim().email("Valid test recipient email is required."),
});

const safeErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unknown Resend diagnostic error.";
};

const getSafeProviderError = (error: unknown) => {
  if (!error || typeof error !== "object") return safeErrorMessage(error);
  const value = error as Record<string, unknown>;
  return {
    name: typeof value.name === "string" ? value.name : undefined,
    message: safeErrorMessage(error),
    statusCode: typeof value.statusCode === "number" ? value.statusCode : undefined,
  };
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { context } = await requirePermission(session.user.id, "members:create");
    const data = diagnosticEmailSchema.parse(await request.json());

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "RESEND_API_KEY is not configured." }, { status: 500 });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!fromEmail) {
      return NextResponse.json({ success: false, error: "RESEND_FROM_EMAIL is not configured." }, { status: 500 });
    }

    const fromName = process.env.RESEND_FROM_NAME || "ChapterHQ";
    const resend = new Resend(apiKey);

    console.log("[InvitationEmailDebug] direct Resend diagnostic started");
    console.log(`[InvitationEmailDebug] organizationId: ${context.organizationId}`);
    console.log(`[InvitationEmailDebug] recipient: ${data.email}`);
    console.log("[InvitationEmailDebug] calling Resend directly");

    const response = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: data.email,
      subject: "ChapterHQ Invitation Diagnostic",
      html: "<p>ChapterHQ invitation email diagnostic.</p>",
    });

    if (response.error) {
      const providerError = getSafeProviderError(response.error);
      console.error("[InvitationEmailDebug] direct Resend diagnostic failed", providerError);
      return NextResponse.json({ success: false, providerError }, { status: 502 });
    }

    if (!response.data?.id) {
      return NextResponse.json(
        { success: false, providerError: "Resend did not return a provider message ID." },
        { status: 502 }
      );
    }

    console.log(`[InvitationEmailDebug] direct Resend diagnostic result: ${response.data.id}`);
    return NextResponse.json({ success: true, resendId: response.data.id });
  } catch (error: unknown) {
    console.error("========== DIRECT RESEND RAW ERROR ==========");
    console.error(error);
    console.error("NAME:", error instanceof Error ? error.name : typeof error);
    console.error("MESSAGE:", error instanceof Error ? error.message : String(error));
    console.error("STACK:", error instanceof Error ? error.stack : "NO STACK");
    console.error("CAUSE:", error instanceof Error ? error.cause : undefined);
    console.error("=============================================");

    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, error: safeErrorMessage(error), cause: error instanceof Error ? safeErrorMessage(error.cause) : undefined },
      { status: 500 }
    );
  }
}
