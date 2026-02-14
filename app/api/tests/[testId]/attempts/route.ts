import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
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

    const attemptsUsed = await prisma.testResult.count({
      where: { testId, userId: session.user.id },
    });

    const attemptLimit = test.attemptLimit || 1;
    const attemptsRemaining = Math.max(0, attemptLimit - attemptsUsed);

    return NextResponse.json({ attemptLimit, attemptsUsed, attemptsRemaining });
  } catch (error) {
    console.error("Fetch attempts error:", error);
    return NextResponse.json({ error: "Failed to fetch attempts" }, { status: 500 });
  }
}
