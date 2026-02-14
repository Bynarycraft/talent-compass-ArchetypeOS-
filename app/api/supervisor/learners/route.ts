import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || (role !== "supervisor" && role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const whereClause =
    role === "supervisor"
      ? { supervisorId: session.user.id }
      : { role: { in: ["candidate", "learner"] } };

  try {
    const learners = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        archetype: true,
        supervisorId: true,
        courseEnrollments: {
          include: {
            course: {
              select: { id: true, title: true, difficulty: true },
            },
          },
        },
      },
    });

    return NextResponse.json(learners);
  } catch (error) {
    console.error("Fetch learners error:", error);
    return NextResponse.json({ error: "Failed to fetch learners" }, { status: 500 });
  }
}
