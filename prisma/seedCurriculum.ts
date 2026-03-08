import { PrismaClient } from "../generated/prisma";
import { ontarioGrade11CurriculumSeed } from "./curriculumSeed";

const prisma = new PrismaClient();

async function main() {
  await prisma.ontarioCurriculumExpectation.deleteMany();
  await prisma.ontarioCurriculumUnit.deleteMany();
  await prisma.ontarioCurriculumCourse.deleteMany();

  for (const course of ontarioGrade11CurriculumSeed) {
    await prisma.ontarioCurriculumCourse.create({
      data: {
        code: course.code,
        title: course.title,
        grade: course.grade,
        subject: course.subject,
        destination: course.destination,
        description: course.description,
        keywords: course.keywords,
        units: {
          create: course.units.map((unit, unitIndex) => ({
            code: unit.code,
            title: unit.title,
            description: unit.description,
            weight: unit.weight,
            orderIndex: unitIndex,
            expectations: {
              create: unit.expectations.map((expectation) => ({
                code: expectation.code,
                title: expectation.title,
                description: expectation.description,
                strand: expectation.strand,
              })),
            },
          })),
        },
      },
    });
  }

  const count = await prisma.ontarioCurriculumCourse.count();
  console.log(`Seeded ${count} Ontario curriculum courses.`);
}

main()
  .catch((error) => {
    console.error("Failed to seed Ontario curriculum data", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
