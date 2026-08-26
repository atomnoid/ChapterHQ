import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { z } from "zod";
import { apiResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import {
  EventRegistrationService,
  EventNotFoundError,
  RegistrationLimitExceededError,
} from "@/services/event-registration.service";

const registrationService = new EventRegistrationService();

const externalSchema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
  usn: z.string().trim().max(50).optional(),
  customAnswers: z.any().optional(),
});

const memberSchema = z.object({
  memberId: z.string().min(1, "memberId is required."),
});

const schema = z.union([externalSchema, memberSchema]);

/**
 * POST /api/events/[id]/public-register
 * Public registration endpoint — no auth required.
 * Detects member vs external participant automatically.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;
    const body = await request.json();

    // Detect if this is a member registration (has memberId) or external
    if ("memberId" in body && body.memberId) {
      const { memberId } = memberSchema.parse(body);

      // Get the event to find organizationId
      const event = await prisma.event.findFirst({ where: { id: eventId } });
      if (!event || event.deletedAt) {
        return apiResponse.notFound("Event not found.");
      }
      if (event.status !== "PUBLISHED") {
        return apiResponse.badRequest("Registration is not open for this event.");
      }

      const registration = await registrationService.publicRegisterMember(
        event.organizationId,
        eventId,
        memberId
      );

      return apiResponse.created(
        { type: "member", registration },
        "Registration successful."
      );
    } else {
      const data = externalSchema.parse(body);

      // Resolve name and email from customAnswers if not provided directly
      let resolvedName = data.name?.trim();
      let resolvedEmail = data.email?.trim();
      if (data.customAnswers && typeof data.customAnswers === "object") {
        const ca = data.customAnswers as Record<string, any>;
        if (!resolvedName) {
          // look for a field whose key contains 'name'
          const nameKey = Object.keys(ca).find((k) => /name/i.test(k));
          if (nameKey) resolvedName = String(ca[nameKey]);
        }
        if (!resolvedEmail) {
          const emailKey = Object.keys(ca).find((k) => /email/i.test(k));
          if (emailKey) resolvedEmail = String(ca[emailKey]);
        }
      }
      if (!resolvedName) resolvedName = "Participant";
      if (!resolvedEmail) resolvedEmail = `participant-${Date.now()}@noemail.local`;

      // Get the event to find organizationId
      const event = await prisma.event.findFirst({ where: { id: eventId } });
      if (!event || event.deletedAt) {
        return apiResponse.notFound("Event not found.");
      }
      if (event.status !== "PUBLISHED") {
        return apiResponse.badRequest("Registration is not open for this event.");
      }

      const result = await registrationService.publicRegisterExternal(
        event.organizationId,
        eventId,
        {
          ...data,
          name: resolvedName,
          email: resolvedEmail,
        }
      );

      return apiResponse.created(result, "Registration successful.");
    }
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid request.");
    }
    if (error instanceof EventNotFoundError) return apiResponse.notFound(error.message);
    if (error instanceof RegistrationLimitExceededError) return apiResponse.conflict(error.message);
    return apiResponse.serverError();
  }
}

/**
 * GET /api/events/[id]/public-register
 * Returns basic event info for the public registration page (no auth needed).
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await context.params;
    const event = await prisma.event.findFirst({ where: { id: eventId } });

    if (!event || event.deletedAt) {
      return apiResponse.notFound("Event not found.");
    }

    // Fetch custom form for the event, if configured
    const customForms = await prisma.customForm.findMany({
      where: { eventId },
      include: {
        fields: {
          orderBy: { order: "asc" },
        },
      },
    });
    const customForm = customForms.find((f) => !f.deletedAt) ?? null;

    return apiResponse.success({
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      capacity: event.capacity,
      registrationRequired: event.registrationRequired,
      customForm: customForm ? {
        id: customForm.id,
        name: customForm.name,
        description: customForm.description,
        fields: customForm.fields,
      } : null,
    });
  } catch {
    return apiResponse.serverError();
  }
}
