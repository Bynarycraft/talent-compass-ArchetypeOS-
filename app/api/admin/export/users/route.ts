import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        courseEnrollments: true,
        dailyLearningSessions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const header = [
      "id",
      "name",
      "email",
      "role",
      "archetype",
      "createdAt",
      "coursesCompleted",
      "learningMinutes",
    ];

    const rows = users.map((user) => {
      const coursesCompleted = user.courseEnrollments.filter((enroll) => enroll.status === "completed").length;
      const learningMinutes = user.dailyLearningSessions.reduce(
        (acc, sessionItem) => acc + (sessionItem.durationMinutes || 0),
        0
      );

      return [
        user.id,
        user.name || "",
        user.email || "",
        user.role,
        user.archetype || "",
        user.createdAt.toISOString(),
        coursesCompleted.toString(),
        learningMinutes.toString(),
      ];
    });

    const csv = [header.join(","), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=users-export.csv",
      },
    });
  } catch (error) {
    console.error("Export users error:", error);
    return NextResponse.json({ error: "Failed to export users" }, { status: 500 });
  }
}
