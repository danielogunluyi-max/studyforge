"use server";

import { type Exam } from "../../../generated/prisma";
import { auth } from "~/server/auth";
import { calculateOntarioOverall } from "@/lib/gradeUtils";
import { prisma } from "@/lib/prisma";

type ResultMode = "simple" | "ontario";

type RecordExamResultInput = {
  examId: string;
  mode: ResultMode;
  scorePercent?: number;
  gradeKU?: number;
  gradeThinking?: number;
  gradeComm?: number;
  gradeApp?: number;
  resultNotes?: string;
};

type RecordExamResultResponse = {
  success: boolean;
  error?: string;
  exam?: Exam;
};

function isValidPercent(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function clampPercent(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export async function recordExamResult(input: RecordExamResultInput): Promise<RecordExamResultResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!input.examId?.trim()) {
    return { success: false, error: "Exam ID is required" };
  }

  const exam = await prisma.exam.findUnique({ where: { id: input.examId } });
  if (!exam || exam.userId !== session.user.id) {
    return { success: false, error: "Exam not found" };
  }

  if (exam.examDate.getTime() >= new Date().getTime()) {
    return { success: false, error: "You can only record results after the exam date has passed" };
  }

  const resultNotes = input.resultNotes?.trim() || null;
  const now = new Date();

  if (input.mode === "simple") {
    if (!isValidPercent(input.scorePercent)) {
      return { success: false, error: "Please enter a valid score between 0 and 100" };
    }

    const updated = await prisma.exam.update({
      where: { id: exam.id },
      data: {
        resultRecorded: true,
        scorePercent: clampPercent(input.scorePercent),
        gradeKU: null,
        gradeThinking: null,
        gradeComm: null,
        gradeApp: null,
        resultNotes,
        resultRecordedAt: now,
      },
    });

    return { success: true, exam: updated };
  }

  if (!isValidPercent(input.gradeKU) || !isValidPercent(input.gradeThinking) || !isValidPercent(input.gradeComm) || !isValidPercent(input.gradeApp)) {
    return { success: false, error: "Please enter all Ontario category scores between 0 and 100" };
  }

  const overall = calculateOntarioOverall(
    input.gradeKU,
    input.gradeThinking,
    input.gradeComm,
    input.gradeApp,
  );

  const updated = await prisma.exam.update({
    where: { id: exam.id },
    data: {
      resultRecorded: true,
      scorePercent: clampPercent(overall),
      gradeKU: clampPercent(input.gradeKU),
      gradeThinking: clampPercent(input.gradeThinking),
      gradeComm: clampPercent(input.gradeComm),
      gradeApp: clampPercent(input.gradeApp),
      resultNotes,
      resultRecordedAt: now,
    },
  });

  return { success: true, exam: updated };
}

export async function getExamResults(userId: string): Promise<Exam[]> {
  return prisma.exam.findMany({
    where: {
      userId,
      resultRecorded: true,
    },
    orderBy: {
      examDate: "desc",
    },
  });
}
