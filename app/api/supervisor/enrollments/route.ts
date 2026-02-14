import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || (role !== "supervisor" && role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { enrollmentId, status, progress } = body || {};

    if (!enrollmentId) {
      return NextResponse.json({ error: "enrollmentId is required" }, { status: 400 });
    }

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { user: { select: { id: true, supervisorId: true } } },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    if (role === "supervisor" && enrollment.user.supervisorId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updates: {
      status?: string;
      progress?: number;
      completedAt?: Date | null;
    } = {};

    if (typeof progress === "number") {
      updates.progress = Math.max(0, Math.min(100, progress));
      if (updates.progress >= 100) {
        updates.status = "completed";
        updates.completedAt = new Date();
      }
    }

    if (status) {
      updates.status = status;
      updates.completedAt = status === "completed" ? new Date() : null;
      if (status === "completed") {
        updates.progress = 100;
      }
      if (status === "in_progress" && typeof progress !== "number") {
        updates.progress = enrollment.progress ?? 0;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    const updated = await prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: updates,
    });

    if (updates.status === "completed" || updates.progress === 100) {
      const existing = await prisma.auditLog.findFirst({
        where: {
          userId: updated.userId,
          action: "certificate",
          targetId: updated.courseId,
        },
      });

      if (!existing) {
        await prisma.auditLog.create({
          data: {
            userId: updated.userId,
            action: "certificate",
            targetType: "course",
            targetId: updated.courseId,
            details: "Course completed",
          },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update enrollment error:", error);
    return NextResponse.json({ error: "Failed to update enrollment" }, { status: 500 });
  }
}
