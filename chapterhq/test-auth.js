const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching users from DB...");
  const users = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: "desc" }
  });
  console.log("Users in Database:");
  users.forEach(user => {
    console.log({
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      status: user.status,
      deletedAt: user.deletedAt
    });
  });

  if (users.length > 0) {
    const user = users[0];
    if (user.password) {
      console.log("\nTesting splitting of password hash for:", user.email);
      const parts = user.password.split("$");
      console.log("Parts:", parts);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
