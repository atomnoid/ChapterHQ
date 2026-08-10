import { prisma } from "@/lib/prisma";

export async function isPresident(userId: string, organizationId: string): Promise<boolean> {
  try {
    const member = await prisma.member.findFirst({
      where: { userId, organizationId, status: "ACTIVE" },
    });
    if (!member || member.deletedAt) return false;

    const userRoles = await prisma.userRole.findMany({
      where: { memberId: member.id },
      include: { role: true },
    });
    return userRoles.some((ur) => ur.role.name === "President" && !ur.role.deletedAt);
  } catch {
    return false;
  }
}

export async function isCommitteeHead(userId: string, organizationId: string, committeeId: string): Promise<boolean> {
  try {
    // Verify the committee belongs to this organization first — prevents cross-org bypass.
    const committee = await prisma.committee.findFirst({
      where: { id: committeeId, organizationId },
    });
    if (!committee || committee.deletedAt) return false;

    const member = await prisma.member.findFirst({
      where: { userId, organizationId, status: "ACTIVE" },
    });
    if (!member || member.deletedAt) return false;

    const appointments = await prisma.appointment.findMany({
      where: {
        committeeId,
        memberId: member.id,
        status: "ACTIVE",
        designation: {
          in: ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"],
        },
      },
    });
    return appointments.some((a) => !a.deletedAt);
  } catch {
    return false;
  }
}

export async function isCommitteeMember(userId: string, organizationId: string, committeeId: string): Promise<boolean> {
  try {
    const member = await prisma.member.findFirst({
      where: { userId, organizationId, status: "ACTIVE" },
    });
    if (!member || member.deletedAt) return false;

    const committeeMembers = await prisma.committeeMember.findMany({
      where: {
        committeeId,
        memberId: member.id,
      },
    });
    return committeeMembers.some((cm) => !cm.deletedAt);
  } catch {
    return false;
  }
}
