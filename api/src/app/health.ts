import { prisma } from './prisma';

export async function checkDatabaseConnection() {
  await prisma.$runCommandRaw({
    ping: 1,
  });

  return {
    database: 'connected',
  };
}
