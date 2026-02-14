import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const tests = await prisma.test.findMany({
      include: {
        course: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error("Fetch tests error:", error);
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      courseId,
      title,
      description,
      questions,
      type = "MCQ",
      timeLimit,
      passingScore = 70,
    } = body || {};

    if (!courseId || !title || !questions) {
      return NextResponse.json({ error: "courseId, title, and questions are required" }, { status: 400 });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "questions must be a non-empty array" }, { status: 400 });
    }

    const test = await prisma.test.create({
      data: {
        courseId,
        title,
        description,
        type,
        timeLimit,
        passingScore,
        questions: JSON.stringify(questions),
      },
      include: {
        course: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error("Create test error:", error);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}
