import { PrismaClient } from "../generated/prisma";
import { ontarioGrade11CurriculumSeed, type CurriculumSeedCourse } from "./curriculumSeed";
import { ontarioGrade12TopSeed } from "./curriculumSeedGrade12";

const prisma = new PrismaClient();

async function upsertCourse(course: CurriculumSeedCourse) {
  const existing = await prisma.ontarioCurriculumCourse.findUnique({
    where: { code: course.code },
    select: { id: true },
  });

  if (existing) {
    await prisma.ontarioCurriculumExpectation.deleteMany({
      where: { unit: { courseId: existing.id } },
    });
    await prisma.ontarioCurriculumUnit.deleteMany({ where: { courseId: existing.id } });
    await prisma.ontarioCurriculumCourse.update({
      where: { id: existing.id },
      data: {
        title: course.title,
        grade: course.grade,
        subject: course.subject,
        destination: course.destination,
        description: course.description,
        keywords: course.keywords,
        isSeeded: true,
        seededAt: new Date(),
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
    return;
  }

  await prisma.ontarioCurriculumCourse.create({
    data: {
      code: course.code,
      title: course.title,
      grade: course.grade,
      subject: course.subject,
      destination: course.destination,
      description: course.description,
      keywords: course.keywords,
      isSeeded: true,
      seededAt: new Date(),
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

async function main() {
  const all = [...ontarioGrade11CurriculumSeed, ...ontarioGrade12TopSeed];
  for (const course of all) {
    await upsertCourse(course);
    console.log(`Upserted ${course.code}`);
  }

  const count = await prisma.ontarioCurriculumCourse.count();
  const seeded = await prisma.ontarioCurriculumCourse.count({ where: { isSeeded: true } });
  const units = await prisma.ontarioCurriculumUnit.count();
  const exps = await prisma.ontarioCurriculumExpectation.count();
  console.log(`Courses: ${count} (seeded flag: ${seeded}) · units: ${units} · expectations: ${exps}`);
}

main()
  .catch((error) => {
    console.error("Failed to seed Ontario curriculum data", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
