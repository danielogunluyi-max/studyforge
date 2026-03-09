import { prisma } from "./prisma.ts";

async function main() {
  const seeded = await prisma.ontarioCurriculumCourse.count({ where: { isSeeded: true } });
  const total = await prisma.ontarioCurriculumCourse.count();
  const expectations = await prisma.ontarioCurriculumExpectation.count();
  console.log(JSON.stringify({ seeded, total, expectations }));
  await prisma.$disconnect();
}

void main();
