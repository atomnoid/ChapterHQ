import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function generateToken(): string {
  return "ext_" + crypto.randomBytes(24).toString("hex");
}

export interface CreateExternalRegistrationData {
  eventId: string;
  name: string;
  email: string;
  phone?: string;
  usn?: string;
  customAnswers?: any;
}

export class ExternalRegistrationRepository {
  async create(data: CreateExternalRegistrationData) {
    const token = generateToken();
    return prisma.externalRegistration.create({
      data: {
        eventId: data.eventId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        usn: data.usn,
        customAnswers: data.customAnswers || null,
        checkInToken: token,
        status: "REGISTERED",
      },
    });
  }

  async findByEventAndEmail(eventId: string, email: string) {
    const reg = await prisma.externalRegistration.findFirst({
      where: { eventId, email },
    });
    if (reg?.deletedAt) return null;
    return reg;
  }

  async findByToken(token: string) {
    return prisma.externalRegistration.findUnique({
      where: { checkInToken: token },
      include: {
        event: true,
        attendance: true,
      },
    });
  }

  async cancel(id: string) {
    return prisma.externalRegistration.update({
      where: { id },
      data: { status: "CANCELLED", deletedAt: new Date() },
    });
  }

  async listByEvent(eventId: string) {
    const allItems = await prisma.externalRegistration.findMany({
      where: { eventId },
      include: {
        attendance: true,
      },
      orderBy: { registeredAt: "desc" },
    });
    // MongoDB Prisma bug workaround: post-filter soft-deleted
    return allItems.filter((r) => !r.deletedAt);
  }

  async markAttendance(registrationId: string, eventId: string) {
    // Check if already marked
    const existing = await prisma.externalAttendance.findFirst({
      where: { registrationId },
    });

    if (existing) {
      return { attendance: existing, alreadyMarked: true };
    }

    const attendance = await prisma.externalAttendance.create({
      data: {
        eventId,
        registrationId,
        status: "PRESENT",
        markedAt: new Date(),
      },
    });

    return { attendance, alreadyMarked: false };
  }

  async getAttendanceByRegistrationId(registrationId: string) {
    return prisma.externalAttendance.findFirst({
      where: { registrationId },
    });
  }
}
