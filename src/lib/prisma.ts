import { PrismaClient } from "../../generated/prisma/index.js";

export { Prisma } from "../../generated/prisma/index.js";

declare global {
   
  var __kyvexPrisma: PrismaClient | undefined;
}

export const prisma = global.__kyvexPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__kyvexPrisma = prisma;
}

