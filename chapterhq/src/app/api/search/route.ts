import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiResponse } from "@/lib/api-response";
import { AuthorizationService } from "@/services/permission/authorization.service";
import { prisma } from "@/lib/prisma";

const authorizationService = new AuthorizationService();
const querySchema = z.object({ q: z.string().trim().min(2, "Enter at least 2 characters.").max(100, "Search is limited to 100 characters.") });
const LIMIT = 5;
const scoped = (organizationId: string, committeeId?: string | null) => ({ organizationId, ...(committeeId ? { committeeId } : {}) });

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiResponse.unauthorized();
    const { q } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const [context, permissions] = await Promise.all([authorizationService.resolveContext(session.user.id), authorizationService.resolveCurrentPermissions(session.user.id)]);
    const allowed = new Set(permissions.map((p) => `${p.resource}:${p.action}`));
    const contains = { contains: q, mode: "insensitive" as const };
    const committeeId = context.activeCommitteeId;
    const jobs: Promise<any[]>[] = [];
    if (allowed.has("members:read")) jobs.push(prisma.member.findMany({ where: { organizationId: context.organizationId, status: "ACTIVE", user: { OR: [{ name: contains }, { email: contains }] } }, take: LIMIT, include: { user: { select: { name: true, email: true } } } }).then(rows => rows.filter(r => !r.deletedAt).map(r => ({ id: r.id, type: "member", title: r.user.name ?? r.user.email, description: r.user.email, metadata: {}, href: "/members" }))));
    if (allowed.has("roles:read")) jobs.push(prisma.role.findMany({ where: { organizationId: context.organizationId, OR: [{ name: contains }, { description: contains }] }, take: LIMIT }).then(rows => rows.filter(r => !r.deletedAt).map(r => ({ id: r.id, type: "role", title: r.name, description: r.description ?? "Role", metadata: {}, href: "/roles" }))));
    if (allowed.has("events:read")) jobs.push(prisma.event.findMany({ where: { ...scoped(context.organizationId, committeeId), OR: [{ title: contains }, { description: contains }] }, take: LIMIT }).then(rows => rows.filter(r => !r.deletedAt).map(r => ({ id: r.id, type: "event", title: r.title, description: r.venue ?? "Event", metadata: {}, href: `/events/${r.id}` }))));
    if (allowed.has("finance:read")) jobs.push(prisma.financeRecord.findMany({ where: { ...scoped(context.organizationId, committeeId), OR: [{ category: contains }, { description: contains }] }, take: LIMIT }).then(rows => rows.filter(r => !r.deletedAt).map(r => ({ id: r.id, type: "finance", title: r.category, description: `${r.type}: ${r.amount}`, metadata: {}, href: "/finance" }))));
    if (allowed.has("inventory:read")) jobs.push(prisma.inventoryItem.findMany({ where: { ...scoped(context.organizationId, committeeId), OR: [{ name: contains }, { category: contains }] }, take: LIMIT }).then(rows => rows.filter(r => !r.deletedAt).map(r => ({ id: r.id, type: "inventory", title: r.name, description: r.category ?? "Inventory", metadata: {}, href: "/inventory" }))));
    const results = (await Promise.all(jobs)).flat().slice(0, 25);
    return apiResponse.success({ items: results });
  } catch (error: any) {
    if (error?.name === "PermissionDeniedError") return apiResponse.forbidden();
    if (error instanceof z.ZodError) return apiResponse.badRequest(error.issues[0]?.message ?? "Invalid search.");
    return apiResponse.serverError();
  }
}
