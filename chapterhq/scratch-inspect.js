// Quick check: what does the registrations list endpoint return?
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const regs = await prisma.eventRegistration.findMany({
    take: 3,
    include: {
      member: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } }
        }
      }
    }
  });
  
  const active = regs.filter(r => !r.deletedAt);
  console.log("Active registrations (first 3):");
  active.forEach(r => {
    console.log({
      id: r.id,
      eventId: r.eventId,
      memberId: r.memberId,
      memberId_type: typeof r.memberId,
      memberId_length: r.memberId?.length,
      status: r.status,
    });
    // Simulate the URL that would be called
    console.log("  → DELETE URL:", `/api/events/${r.eventId}/registrations/${r.memberId}`);
  });
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
