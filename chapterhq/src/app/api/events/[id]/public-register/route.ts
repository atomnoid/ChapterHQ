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
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().email("A valid email is required."),
  phone: z.string().trim().max(20).optional(),
  usn: z.string().trim().max(50).optional(),
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
        data
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
    });
  } catch {
    return apiResponse.serverError();
  }
}
