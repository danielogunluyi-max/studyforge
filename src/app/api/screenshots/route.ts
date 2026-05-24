import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, subject, imageData, noteId } = (await request.json()) as {
      title?: string;
      subject?: string;
      imageData?: string;
      noteId?: string | null;
    };

    if (!title || !subject || !imageData) {
      return NextResponse.json(
        { error: 'Missing required fields: title, subject, imageData' },
        { status: 400 }
      );
    }

    // Validate base64 image data
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image data format' },
        { status: 400 }
      );
    }

    // Verify note ownership if linking at create time
    let safeNoteId: string | null = null;
    if (noteId) {
      const note = await prisma.note.findFirst({
        where: { id: noteId, userId: session.user.id },
        select: { id: true },
      });
      if (!note) {
        return NextResponse.json({ error: 'Note not found' }, { status: 404 });
      }
      safeNoteId = note.id;
    }

    const screenshot = await prisma.screenshot.create({
      data: {
        title,
        subject,
        imageData,
        userId: session.user.id,
        noteId: safeNoteId,
      },
    });

    return NextResponse.json(screenshot, { status: 201 });
  } catch (error) {
    console.error('Error saving screenshot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const search = searchParams.get('search');
    const noteId = searchParams.get('noteId');

    const screenshots = await prisma.screenshot.findMany({
      where: {
        userId: session.user.id,
        ...(subject && { subject }),
        ...(noteId && { noteId }),
        ...(search && {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      },
      include: {
        note: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(screenshots);
  } catch (error) {
    console.error('Error fetching screenshots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Screenshot ID is required' },
        { status: 400 }
      );
    }

    // Verify the screenshot belongs to the user
    const screenshot = await prisma.screenshot.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!screenshot) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      );
    }

    await prisma.screenshot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting screenshot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = (await request.json().catch(() => ({}))) as {
      noteId?: string | null;
      subject?: string;
    };

    if (!id) {
      return NextResponse.json(
        { error: 'Screenshot ID is required' },
        { status: 400 }
      );
    }

    // Verify the screenshot belongs to the user
    const screenshot = await prisma.screenshot.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!screenshot) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      );
    }

    // If linking to a note, verify the note belongs to the user
    if (body.noteId) {
      const note = await prisma.note.findFirst({
        where: {
          id: body.noteId,
          userId: session.user.id,
        },
      });

      if (!note) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
    }

    // Build a partial update: only include fields that were sent
    const data: { noteId?: string | null; subject?: string } = {};
    if ('noteId' in body) {
      data.noteId = body.noteId || null;
    }
    if (typeof body.subject === 'string') {
      const trimmed = body.subject.trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Subject cannot be empty' }, { status: 400 });
      }
      if (trimmed.length > 80) {
        return NextResponse.json({ error: 'Subject is too long (max 80 chars)' }, { status: 400 });
      }
      data.subject = trimmed;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updatedScreenshot = await prisma.screenshot.update({
      where: { id },
      data,
      include: {
        note: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(updatedScreenshot);
  } catch (error) {
    console.error('Error updating screenshot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}