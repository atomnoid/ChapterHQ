const { execSync } = require('child_process');
try {
  console.log("Running prisma generate...");
  const output = execSync('npx prisma generate', { stdio: 'inherit' });
  console.log("Prisma generate completed successfully.");
} catch (e) {
  console.error("Prisma generate failed:", e.message);
  process.exit(1);
}
