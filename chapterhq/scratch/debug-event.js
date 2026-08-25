const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== DB Diagnostic ===");
  const events = await prisma.event.findMany({ take: 5 });
  console.log(`Found ${events.length} events:`);
  events.forEach(e => {
    console.log(`ID: ${e.id}, Title: ${e.title}, Status: ${e.status}, deletedAt: ${e.deletedAt}`);
  });

  if (events.length > 0) {
    const targetEventId = events[0].id;
    console.log(`\nTesting queries for event ID: ${targetEventId}`);
    
    try {
      const regCount = await prisma.eventRegistration.count({ where: { eventId: targetEventId } });
      console.log(`Registrations count: ${regCount}`);
    } catch (e) {
      console.error("Failed to count registrations:", e);
    }

    try {
      const att = await prisma.attendance.findMany({
        where: { eventId: targetEventId },
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });
      console.log(`Found ${att.length} attendance records.`);
    } catch (e) {
      console.error("Failed to fetch attendance:", e);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
