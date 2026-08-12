import { prisma } from "@/lib/prisma";
import { ALL_PERMISSIONS } from "@/constants/permissions";

async function memberHasAllPermissions(memberId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { memberId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const permissionKeys = new Set<string>();
  userRoles
    .filter((ur) => !ur.role.deletedAt && ur.role.status === "ACTIVE")
    .forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissionKeys.add(`${rp.permission.resource}:${rp.permission.action}`);
      });
    });

  return ALL_PERMISSIONS.every((permission) => permissionKeys.has(permission));
}

export async function isPresident(userId: string, organizationId: string): Promise<boolean> {
  try {
    const member = await prisma.member.findFirst({
      where: { userId, organizationId, status: "ACTIVE" },
    });
    if (!member || member.deletedAt) return false;

    return memberHasAllPermissions(member.id);
  } catch {
    return false;
  }
}

export async function isCommitteeHead(userId: string, organizationId: string, committeeId: string): Promise<boolean> {
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
    },
  });

  return appointments.some((a) => !a.deletedAt && ["Committee Head", "Head", "Chairman", "Chair", "Committee Lead", "Lead"].includes(a.designation));
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
