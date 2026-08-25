import { PrismaClient } from "@prisma/client";
import { EventService } from "../src/services/event.service";
import { EventRegistrationService } from "../src/services/event-registration.service";

const prisma = new PrismaClient();
const eventService = new EventService();
const registrationService = new EventRegistrationService();

async function main() {
  const eventId = "6a8d72a2e3dcf4f50d0cc853"; // anual meet event id
  const orgId = "6a7c65877775dfc6f979acb5";

  // Test 2: getRegistrations
  try {
    console.log(`\n--- Testing registrationService.getRegistrations for event ${eventId} ---`);
    const mockQuery = {
      page: 1,
      limit: 100,
      order: "desc" as const
    };
    const result = await registrationService.getRegistrations(
      orgId,
      eventId,
      mockQuery,
      null
    );
    console.log(`Success! Found ${result.items.length} registrations. Details:`, result.items);
  } catch (e) {
    console.error("Error in getRegistrations:", e);
  }

  // Test 3: getAttendanceList
  try {
    console.log(`\n--- Testing registrationService.getAttendanceList for event ${eventId} ---`);
    const result = await registrationService.getAttendanceList(
      orgId,
      eventId,
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
