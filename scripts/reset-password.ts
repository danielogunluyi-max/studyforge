import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/index.js";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = "daniel.ogunluyi@gmail.com";
  const newPassword = "TempPass123!";

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(`User not found with email: ${email}`);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  console.log(`Password for ${email} has been reset to ${newPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
