import { PrismaClient } from "@prisma/client";
import { EventService } from "../src/services/event.service";
import { EventRegistrationService } from "../src/services/event-registration.service";

const prisma = new PrismaClient();
const eventService = new EventService();
const registrationService = new EventRegistrationService();

async function main() {
  // Find all events and filter manually
  const allEvents = await prisma.event.findMany({});
  const event = allEvents.find(e => !e.deletedAt);
  if (!event) {
    console.error("No active event found in the entire database.");
    return;
  }
  console.log(`Using Event: ${event.id}, Title: ${event.title}, Org: ${event.organizationId}, CommitteeId: ${event.committeeId}`);

  // Find a member in that event's organization
  const allMembers = await prisma.member.findMany({
    where: { organizationId: event.organizationId, status: "ACTIVE" },
    include: { user: true }
  });
  const member = allMembers.find(m => !m.deletedAt);
  if (!member) {
    console.error(`No active member found for Org ${event.organizationId}`);
    return;
  }
  console.log(`Using Member: ${member.id}, User: ${member.userId}, Email: ${member.user.email}`);

  // Test 1: getEvent
  try {
    console.log("\n--- Testing eventService.getEvent ---");
    const result = await eventService.getEvent(event.id, event.organizationId, null);
    console.log("Success! Event title:", result.title);
  } catch (e) {
    console.error("Error in getEvent:", e);
  }

  // Test 2: getRegistrations
  try {
    console.log("\n--- Testing registrationService.getRegistrations ---");
    const mockQuery = {
      page: 1,
      limit: 100,
      order: "desc" as const
    };
    const result = await registrationService.getRegistrations(
      event.organizationId,
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
      event.organizationId,
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
