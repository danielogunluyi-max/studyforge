import { PrismaClient } from "../../generated/prisma";

declare global {
  // eslint-disable-next-line no-var
  var __studyforgePrisma: PrismaClient | undefined;
}

export const prisma = global.__studyforgePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__studyforgePrisma = prisma;
}
