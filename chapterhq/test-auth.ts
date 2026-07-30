import { PrismaClient } from "@prisma/client";
import { AuthService } from "./src/services/auth.service";

const prisma = new PrismaClient();
const authService = new AuthService();

async function main() {
  console.log("Fetching users from DB...");
  const users = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" }
  });
  console.log("Users:", JSON.stringify(users, null, 2));

  if (users.length === 0) {
    console.log("No users found in database.");
    return;
  }

  // Test verifyPassword with the first user
  const user = users[0];
  console.log(`Testing verifyPassword for user ${user.email} (stored password hash: ${user.password})`);
  // Note: we might not know their plaintext password, but we can register a test user if needed
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
