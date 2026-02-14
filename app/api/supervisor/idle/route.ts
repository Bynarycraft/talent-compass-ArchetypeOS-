import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || (role !== "supervisor" && role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const daysParam = Number(url.searchParams.get("days") || "3");
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - Math.max(1, daysParam));

    const learners = await prisma.user.findMany({
      where: role === "supervisor" ? { supervisorId: session.user.id } : { role: { in: ["candidate", "learner"] } },
      select: { id: true, name: true, email: true, role: true },
    });

    const idleResults = await Promise.all(
      learners.map(async (learner) => {
        const lastSession = await prisma.learningSession.findFirst({
          where: { userId: learner.id },
          orderBy: { startTime: "desc" },
          select: { startTime: true },
        });
        return {
          ...learner,
          lastSessionAt: lastSession?.startTime || null,
        };
      })
    );

    const idleLearners = idleResults.filter((learner) => {
      if (!learner.lastSessionAt) return true;
      return learner.lastSessionAt < threshold;
    });

    return NextResponse.json({ threshold, idleLearners });
  } catch (error) {
    console.error("Fetch idle learners error:", error);
    return NextResponse.json({ error: "Failed to fetch idle learners" }, { status: 500 });
  }
}
