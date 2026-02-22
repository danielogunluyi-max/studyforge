import { NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";

export async function GET() {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
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
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json() as {
      name?: string;
      learningStyle?: string;
      autoAdapt?: boolean;
      theme?: string;
      accentColor?: string;
      fontSize?: string;
      compactMode?: boolean;
      defaultNoteFormat?: string;
      autoSaveNotes?: boolean;
      emailNotifications?: boolean;
    };

    // Validate theme
    if (body.theme && !["light", "dark", "auto"].includes(body.theme)) {
      return NextResponse.json(
        { error: "Invalid theme" },
        { status: 400 }
      );
    }

    // Validate accent color
    if (body.accentColor && !["blue", "purple", "green", "pink", "orange", "indigo"].includes(body.accentColor)) {
      return NextResponse.json(
        { error: "Invalid accent color" },
        { status: 400 }
      );
    }

    // Validate font size
    if (body.fontSize && !["small", "medium", "large"].includes(body.fontSize)) {
      return NextResponse.json(
        { error: "Invalid font size" },
        { status: 400 }
      );
    }

    // Validate default note format
    if (body.defaultNoteFormat && !["summary", "detailed", "flashcards", "questions"].includes(body.defaultNoteFormat)) {
      return NextResponse.json(
        { error: "Invalid note format" },
        { status: 400 }
      );
    }

    // Validate learning style
    if (body.learningStyle && !["visual", "auditory", "reading", "kinesthetic"].includes(body.learningStyle)) {
      return NextResponse.json(
        { error: "Invalid learning style" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.learningStyle !== undefined && { learningStyle: body.learningStyle }),
        ...(body.autoAdapt !== undefined && { autoAdapt: body.autoAdapt }),
        ...(body.theme !== undefined && { theme: body.theme }),
        ...(body.accentColor !== undefined && { accentColor: body.accentColor }),
        ...(body.fontSize !== undefined && { fontSize: body.fontSize }),
        ...(body.compactMode !== undefined && { compactMode: body.compactMode }),
        ...(body.defaultNoteFormat !== undefined && { defaultNoteFormat: body.defaultNoteFormat }),
        ...(body.autoSaveNotes !== undefined && { autoSaveNotes: body.autoSaveNotes }),
        ...(body.emailNotifications !== undefined && { emailNotifications: body.emailNotifications }),
        lastActive: new Date(),
      },
      select: {
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
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
