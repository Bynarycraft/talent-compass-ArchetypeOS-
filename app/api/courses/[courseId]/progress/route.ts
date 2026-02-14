import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;

  try {
    const body = await req.json();
    const { progress } = body || {};

    if (typeof progress !== "number") {
      return NextResponse.json({ error: "progress is required" }, { status: 400 });
    }

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    const normalized = Math.max(0, Math.min(100, progress));
    const updated = await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progress: normalized,
        status: normalized >= 100 ? "completed" : enrollment.status,
        completedAt: normalized >= 100 ? new Date() : enrollment.completedAt,
      },
    });

    if (normalized >= 100) {
      const existing = await prisma.auditLog.findFirst({
        where: {
          userId: session.user.id,
          action: "certificate",
          targetId: courseId,
        },
      });

      if (!existing) {
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "certificate",
            targetType: "course",
            targetId: courseId,
            details: "Course completed",
          },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update progress error:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
