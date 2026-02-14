import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reflectionId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reflectionId } = await params;

  try {
    const reflection = await prisma.reflection.findUnique({
      where: { id: reflectionId },
      select: { id: true, userId: true },
    });

    if (!reflection) {
      return NextResponse.json({ error: "Reflection not found" }, { status: 404 });
    }

    const role = session.user.role?.toLowerCase();
    if (role !== "admin" && role !== "supervisor" && reflection.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const comments = await prisma.feedback.findMany({
      where: {
        threadId: reflectionId,
        type: "reflection",
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Fetch reflection comments error:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ reflectionId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role?.toLowerCase();
  if (role !== "supervisor" && role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { reflectionId } = await params;

  try {
    const body = await req.json();
    const { text } = body || {};

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const reflection = await prisma.reflection.findUnique({
      where: { id: reflectionId },
      select: { id: true, userId: true },
    });

    if (!reflection) {
      return NextResponse.json({ error: "Reflection not found" }, { status: 404 });
    }

    if (role === "supervisor") {
      const learner = await prisma.user.findUnique({
        where: { id: reflection.userId },
        select: { supervisorId: true },
      });

      if (!learner || learner.supervisorId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const comment = await prisma.feedback.create({
      data: {
        senderId: session.user.id,
        receiverId: reflection.userId,
        type: "reflection",
        text: text.trim(),
        threadId: reflectionId,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Create reflection comment error:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
