import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [
      user,
      notes,
      citations,
      examPredictions,
      battles,
      studyGroups,
      conceptConnections,
      decks,
      mockExams,
      mockExamAttempts,
      tutorConversations,
      wellnessEntries,
      captures,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          learningStyle: true,
          autoAdapt: true,
          theme: true,
          accentColor: true,
          fontSize: true,
          compactMode: true,
          defaultNoteFormat: true,
          autoSaveNotes: true,
          emailNotifications: true,
          studyStreak: true,
        },
      }),
      db.note.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          content: true,
          format: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.citation.findMany({
        where: { userId },
        select: {
          id: true,
          author: true,
          title: true,
          publication: true,
          date: true,
          url: true,
          pages: true,
          format: true,
          createdAt: true,
        },
      }),
      db.examPrediction.findMany({
        where: { userId },
        select: {
          id: true,
          examType: true,
          predictions: true,
          createdAt: true,
        },
      }),
      db.battle.findMany({
        where: {
          OR: [{ hostId: userId }, { opponentId: userId }],
        },
        select: {
          id: true,
          title: true,
          status: true,
          hostScore: true,
          opponentScore: true,
          createdAt: true,
        },
      }),
      db.studyGroup.findMany({
        where: {
          members: { some: { userId } },
        },
        select: {
          id: true,
          name: true,
          topic: true,
          createdAt: true,
        },
      }),
      db.conceptConnection.findMany({
        where: { userId },
        select: {
          concept1: true,
          concept2: true,
          connectionDescription: true,
          strength: true,
        },
      }),
      db.flashcardDeck.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          subject: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          cards: {
            select: {
              id: true,
              front: true,
              back: true,
              easeFactor: true,
              interval: true,
              repetitions: true,
              nextReview: true,
              lastReviewed: true,
              createdAt: true,
            },
          },
        },
      }),
      db.mockExam.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          subject: true,
          curriculumCode: true,
          instructions: true,
          timeLimit: true,
          createdAt: true,
          questions: {
            select: {
              id: true,
              question: true,
              options: true,
              answer: true,
              explanation: true,
              type: true,
              points: true,
              orderIndex: true,
              correctIndex: true,
              modelAnswer: true,
              rubric: true,
              unit: true,
            },
          },
        },
      }),
      db.mockExamAttempt.findMany({
        where: { userId },
        select: {
          id: true,
          examId: true,
          answers: true,
          score: true,
          earnedPoints: true,
          totalPoints: true,
          breakdown: true,
          timeTaken: true,
          createdAt: true,
        },
      }),
      db.conversation.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          subject: true,
          curriculumCode: true,
          noteId: true,
          createdAt: true,
          updatedAt: true,
          messages: {
            select: {
              id: true,
              role: true,
              content: true,
              command: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.wellnessEntry.findMany({
        where: { userId },
        select: {
          id: true,
          mood: true,
          energy: true,
          stress: true,
          notes: true,
          burnoutScore: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.screenshot.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          subject: true,
          noteId: true,
          source: true,
          sourceDevice: true,
          imageData: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      completeCopy: true,
      user,
      notes,
      decks,
      cards: decks.flatMap((deck) =>
        deck.cards.map((card) => ({ ...card, deckId: deck.id, deckTitle: deck.title })),
      ),
      mockExams,
      mockExamAttempts,
      tutorThreads: tutorConversations,
      wellnessEntries,
      captures,
      citations,
      examPredictions,
      battles,
      studyGroups,
      conceptConnections,
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = Buffer.from(json, "utf-8");

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="kyvex-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
