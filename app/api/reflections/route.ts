import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET reflections for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");
    const role = session.user.role?.toLowerCase();

    let userId = session.user.id;
    if (requestedUserId && (role === "supervisor" || role === "admin")) {
      if (role === "supervisor") {
        const learner = await prisma.user.findUnique({
          where: { id: requestedUserId },
          select: { supervisorId: true },
        });

        if (!learner || learner.supervisorId !== session.user.id) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      }
      userId = requestedUserId;
    }

    const reflections = await prisma.reflection.findMany({
      where: { userId },
      include: {
        learningSession: {
          select: { id: true, startTime: true, endTime: true, durationMinutes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const includeComments = searchParams.get("includeComments") === "1";
    if (!includeComments || reflections.length === 0) {
      return NextResponse.json(reflections);
    }

    const reflectionIds = reflections.map((reflection) => reflection.id);
    const comments = await prisma.feedback.findMany({
      where: {
        threadId: { in: reflectionIds },
        type: "reflection",
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const commentsByReflection = comments.reduce<Record<string, typeof comments>>((acc, comment) => {
      const key = comment.threadId || "";
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(comment);
      return acc;
    }, {});

    const payload = reflections.map((reflection) => ({
      ...reflection,
      comments: commentsByReflection[reflection.id] || [],
    }));
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Get reflections error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create reflection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { learningSessionId, text, mood, courseId } = body || {};

    if (!learningSessionId || !text) {
      return NextResponse.json({ error: "learningSessionId and text are required" }, { status: 400 });
    }

    const sessionRecord = await prisma.learningSession.findUnique({
      where: { id: learningSessionId },
      select: { id: true, userId: true },
    });

    if (!sessionRecord || sessionRecord.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const reflection = await prisma.reflection.create({
      data: {
        userId: session.user.id,
        learningSessionId,
        text: text.trim(),
        mood,
        courseId,
      },
      include: {
        learningSession: {
          select: { id: true, startTime: true, endTime: true, durationMinutes: true },
        },
      },
    });

    return NextResponse.json(reflection, { status: 201 });
  } catch (error) {
    console.error("Create reflection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
