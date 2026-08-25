const { PrismaClient } = require('./src/generated/prisma-client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function run() {
  console.log('Fetching all registrations...');
  const registrations = await prisma.eventRegistration.findMany({});
  console.log(`Found ${registrations.length} registrations total.`);
  for (const reg of registrations) {
    if (!reg.checkInToken) {
      const token = 'reg_' + crypto.randomBytes(16).toString('hex');
      await prisma.eventRegistration.update({
        where: { id: reg.id },
        data: { checkInToken: token }
      });
      console.log(`Updated registration ${reg.id} with token ${token}`);
    } else {
      console.log(`Registration ${reg.id} already has token ${reg.checkInToken}`);
    }
  }
  console.log('Done!');
  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
