const { PrismaClient } = require("@prisma/client");
const { EventService } = require("../src/services/event.service");
const { EventRegistrationService } = require("../src/services/event-registration.service");

const prisma = new PrismaClient();
const eventService = new EventService();
const registrationService = new EventRegistrationService();

async function main() {
  // Let's find a user, organization, member and event
  const member = await prisma.member.findFirst({
    where: { status: "ACTIVE", deletedAt: null },
    include: { user: true, organization: true }
  });
  if (!member) {
    console.error("No active member found in database.");
    return;
  }
  console.log(`Using Member: ${member.id}, User: ${member.userId}, Email: ${member.user.email}, Org: ${member.organizationId}`);

  const event = await prisma.event.findFirst({
    where: { organizationId: member.organizationId, deletedAt: null }
  });
  if (!event) {
    console.error(`No active event found for Org ${member.organizationId}`);
    return;
  }
  console.log(`Using Event: ${event.id}, Title: ${event.title}, CommitteeId: ${event.committeeId}`);

  // Test 1: getEvent
  try {
    console.log("\n--- Testing eventService.getEvent ---");
    const result = await eventService.getEvent(event.id, member.organizationId, null);
    console.log("Success! Event title:", result.title);
  } catch (e) {
    console.error("Error in getEvent:", e);
  }

  // Test 2: getRegistrations
  try {
    console.log("\n--- Testing registrationService.getRegistrations ---");
    // Simulate empty registration query (default query validation defaults)
    const mockQuery = {
      page: 1,
      limit: 100,
      order: "desc"
    };
    const result = await registrationService.getRegistrations(
      member.organizationId,
      event.id,
      mockQuery,
      null
    );
    console.log(`Success! Found ${result.items.length} registrations.`);
  } catch (e) {
    console.error("Error in getRegistrations:", e);
  }

  // Test 3: getAttendanceList
  try {
    console.log("\n--- Testing registrationService.getAttendanceList ---");
    const result = await registrationService.getAttendanceList(
      member.organizationId,
      event.id,
      null
    );
    console.log(`Success! Found ${result.length} attendance records.`);
  } catch (e) {
    console.error("Error in getAttendanceList:", e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
