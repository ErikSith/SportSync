import { PrismaClient } from '@prisma/client';

// Next.js hot-reloads modules in dev, which would otherwise create a fresh
// PrismaClient (and a fresh DB connection pool) on every edit. Stash the
// instance on `globalThis` so dev mode reuses the same client.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
