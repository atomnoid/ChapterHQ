const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const registrations = await prisma.eventRegistration.findMany({});
  console.log(`=== All Event Registrations (${registrations.length}) ===`);
  registrations.forEach(r => {
    console.log({
      id: r.id,
      eventId: r.eventId,
      memberId: r.memberId,
      status: r.status,
      deletedAt: r.deletedAt
    });
  });

  const attendances = await prisma.attendance.findMany({});
  console.log(`\n=== All Attendance Records (${attendances.length}) ===`);
  attendances.forEach(a => {
    console.log({
      id: a.id,
      eventId: a.eventId,
      memberId: a.memberId,
      status: a.status
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
