import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET feedback for user
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const feedback = await prisma.feedback.findMany({
      where: {
        receiverId: session.user.id,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        receiver: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Get feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create feedback
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      receiverId,
      courseId,
      type = "comment",
      text,
      rating,
      isPrivate = false,
      threadId,
    } = body || {};

    if (!receiverId || !text) {
      return NextResponse.json({ error: "receiverId and text are required" }, { status: 400 });
    }

    if (typeof text !== "string" || text.trim().length < 3) {
      return NextResponse.json({ error: "Feedback text is too short" }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        senderId: session.user.id,
        receiverId,
        courseId,
        type,
        text: text.trim(),
        rating,
        isPrivate,
        threadId,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error) {
    console.error("Create feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
