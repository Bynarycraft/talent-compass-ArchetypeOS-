import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const sessions = await prisma.learningSession.findMany({
      where: {
        userId: session.user.id,
        startTime: { gte: startOfWeek },
      },
      orderBy: { startTime: "asc" },
      select: { startTime: true, durationMinutes: true },
    });

    const days = Array.from({ length: 7 }, (_, idx) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + idx);
      return {
        day: day.toLocaleDateString(),
        minutes: 0,
      };
    });

    sessions.forEach((sessionItem) => {
      const dayIndex = Math.floor(
        (sessionItem.startTime.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (dayIndex >= 0 && dayIndex < days.length) {
        days[dayIndex].minutes += sessionItem.durationMinutes || 0;
      }
    });

    const totalMinutes = days.reduce((acc, item) => acc + item.minutes, 0);
    const goalMinutes = 360 * 7;

    return NextResponse.json({
      days,
      totalMinutes,
      goalMinutes,
    });
  } catch (error) {
    console.error("Weekly session stats error:", error);
    return NextResponse.json({ error: "Failed to fetch weekly stats" }, { status: 500 });
  }
}
