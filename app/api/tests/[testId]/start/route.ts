import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { testId } = await params;

  try {
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { attemptLimit: true, courseId: true },
    });

    if (!test) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const role = session.user.role?.toLowerCase();
    if (role !== "admin" && role !== "supervisor") {
      const enrollment = await prisma.courseEnrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: test.courseId,
          },
        },
      });

      if (!enrollment) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const attemptLimit = test.attemptLimit || 1;
    const completedAttempts = await prisma.testResult.count({
      where: {
        testId,
        userId: session.user.id,
        status: { notIn: ["in_progress", "IN_PROGRESS"] },
      },
    });

    if (completedAttempts >= attemptLimit) {
      return NextResponse.json({ error: "Attempt limit reached" }, { status: 400 });
    }

    const existing = await prisma.testResult.findFirst({
      where: {
        testId,
        userId: session.user.id,
        status: { in: ["in_progress", "IN_PROGRESS"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        attemptNumber: existing.attemptNumber,
        startedAt: existing.startedAt,
      });
    }

    const attemptNumber = completedAttempts + 1;
    const startedAt = new Date();

    const created = await prisma.testResult.create({
      data: {
        testId,
        userId: session.user.id,
        status: "in_progress",
        answers: "{}",
        score: 0,
        attemptNumber,
        startedAt,
      },
    });

    return NextResponse.json({
      id: created.id,
      attemptNumber: created.attemptNumber,
      startedAt: created.startedAt,
    });
  } catch (error) {
    console.error("Start test error:", error);
    return NextResponse.json({ error: "Failed to start assessment" }, { status: 500 });
  }
}
