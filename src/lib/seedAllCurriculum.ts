import { ALL_ONTARIO_COURSES } from "./ontarioCourses.ts";
import { prisma, seedCourse, sleep } from "./curriculumSeeder.ts";

async function seedAll() {
  console.log("Kyvex Ontario Curriculum Auto-Seeder");
  console.log(`Total courses to seed: ${ALL_ONTARIO_COURSES.length}`);
  console.log("This will take several minutes - do not interrupt.\n");

  let success = 0;
  let failed = 0;
  const failedCodes: string[] = [];

  for (const [index, course] of ALL_ONTARIO_COURSES.entries()) {
    console.log(`[${index + 1}/${ALL_ONTARIO_COURSES.length}] Processing ${course.code}`);

    try {
      const result = await seedCourse(course);
      if (!result.seeded && result.error) {
        failed++;
        failedCodes.push(course.code);
        console.log(`  Failed ${course.code}: ${result.error}`);
      } else {
        success++;
        console.log(`  Seeded expectations: ${result.expectationsSeeded}`);
      }
    } catch (error) {
      failed++;
      failedCodes.push(course.code);
      console.error(`  Failed: ${course.code}`, error);
    }

    if (index < ALL_ONTARIO_COURSES.length - 1) {
      await sleep(2000);
    }
  }

  console.log("\n============================");
  console.log("Seeding Complete");
  console.log(`Success: ${success} courses`);
  console.log(`Failed:  ${failed} courses`);
  if (failedCodes.length > 0) {
    console.log(`Failed codes: ${failedCodes.join(", ")}`);
  }
  console.log("============================");

  await prisma.$disconnect();
}

seedAll().catch(async (error) => {
  console.error("Seeder crashed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
