const { PrismaClient } = require('@prisma/client');
const c = new PrismaClient({ log: ['error'] });
console.log('roleCommitteeAccess=' + (typeof c.roleCommitteeAccess !== 'undefined'));
console.log('roleAccessDelegate=' + (typeof c.roleCommitteeAccess?.findMany === 'function'));
c.$disconnect();
