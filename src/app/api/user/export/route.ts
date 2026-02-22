import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all user data
    const [user, notes, citations, examPredictions, battles, studyGroups, conceptConnections] = await Promise.all([
      db.user.findUnique({
        where: { id: session.user.id },
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
        where: { userId: session.user.id },
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
        where: { userId: session.user.id },
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
        where: { userId: session.user.id },
        select: {
          id: true,
          examType: true,
          predictions: true,
          createdAt: true,
        },
      }),
      db.battle.findMany({
        where: {
          OR: [
            { hostId: session.user.id },
            { opponentId: session.user.id },
          ],
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
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
        select: {
          id: true,
          name: true,
          topic: true,
          createdAt: true,
        },
      }),
      db.conceptConnection.findMany({
        where: { userId: session.user.id },
        select: {
          concept1: true,
          concept2: true,
          connectionDescription: true,
          strength: true,
        },
      }),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user,
      notes,
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
        "Content-Disposition": `attachment; filename="studyforge-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export data error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
