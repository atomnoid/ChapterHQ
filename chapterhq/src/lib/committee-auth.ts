import { prisma } from "@/lib/prisma";

export async function isPresident(userId: string, organizationId: string): Promise<boolean> {
  try {
    const member = await prisma.member.findFirst({
      where: { userId, organizationId, status: "ACTIVE", deletedAt: null },
    });
    if (!member) return false;

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
      where: { id: committeeId, organizationId, deletedAt: null },
    });
    if (!committee) return false;

    const member = await prisma.member.findFirst({
      where: { userId, organizationId, status: "ACTIVE", deletedAt: null },
    });
    if (!member) return false;

    const appointment = await prisma.appointment.findFirst({
      where: {
        committeeId,
        memberId: member.id,
        status: "ACTIVE",
        deletedAt: null,
        designation: {
          in: ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"],
        },
      },
    });
    return !!appointment;
  } catch {
    return false;
  }
}

export async function isCommitteeMember(userId: string, organizationId: string, committeeId: string): Promise<boolean> {
  try {
    const member = await prisma.member.findFirst({
      where: { userId, organizationId, status: "ACTIVE", deletedAt: null },
    });
    if (!member) return false;

    const committeeMember = await prisma.committeeMember.findFirst({
      where: {
        committeeId,
        memberId: member.id,
        deletedAt: null,
      },
    });
    return !!committeeMember;
  } catch {
    return false;
  }
}
