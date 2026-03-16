import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (config.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}
export default prisma;

