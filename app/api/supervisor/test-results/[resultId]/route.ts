import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || (role !== "supervisor" && role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { resultId } = await params;

  try {
    const body = await req.json();
    const { score, feedback } = body || {};

    if (typeof score !== "number") {
      return NextResponse.json({ error: "score is required" }, { status: 400 });
    }

    const result = await prisma.testResult.findUnique({
      where: { id: resultId },
      include: { user: { select: { id: true, supervisorId: true } } },
    });

    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    if (role === "supervisor" && result.user.supervisorId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updated = await prisma.testResult.update({
      where: { id: resultId },
      data: {
        score,
        feedback,
        status: "graded",
        gradedBy: session.user.id,
        gradedAt: new Date(),
      },
    });

    const details = {
      title: "Assessment Graded",
      message: `Your assessment has been graded: ${score}%`,
      priority: "normal",
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
    };

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "notification",
        targetType: "user",
        targetId: result.user.id,
        details: JSON.stringify(details),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Grade test error:", error);
    return NextResponse.json({ error: "Failed to grade test" }, { status: 500 });
  }
}
