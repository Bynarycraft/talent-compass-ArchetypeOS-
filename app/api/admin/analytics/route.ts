import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET organization-wide analytics (admin only)
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Total learning hours
    const totalHours = await prisma.learningSession.aggregate({
      _sum: { durationMinutes: true },
    });

    // Total users by role
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: true,
    });

    // Most popular courses
    const topCourses = await prisma.courseEnrollment.groupBy({
      by: ["courseId"],
      _count: true,
      orderBy: { _count: { courseId: "desc" } },
      take: 5,
    });

    // Average test scores
    const avgScore = await prisma.testResult.aggregate({
      _avg: { score: true },
    });

    return NextResponse.json({
      totalLearningMinutes: totalHours._sum.durationMinutes || 0,
      usersByRole,
      topCourses,
      averageTestScore: avgScore._avg.score || 0,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
