import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || (role !== "supervisor" && role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { learnerId, courseId } = body || {};

    if (!learnerId || !courseId) {
      return NextResponse.json({ error: "learnerId and courseId are required" }, { status: 400 });
    }

    const learner = await prisma.user.findUnique({
      where: { id: learnerId },
      select: { id: true, supervisorId: true },
    });

    if (!learner) {
      return NextResponse.json({ error: "Learner not found" }, { status: 404 });
    }

    if (role === "supervisor" && learner.supervisorId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const enrollment = await prisma.courseEnrollment.upsert({
      where: {
        userId_courseId: {
          userId: learnerId,
          courseId,
        },
      },
      update: {
        status: "in_progress",
      },
      create: {
        userId: learnerId,
        courseId,
        status: "in_progress",
        progress: 0,
      },
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error("Assign course error:", error);
    return NextResponse.json({ error: "Failed to assign course" }, { status: 500 });
  }
}
