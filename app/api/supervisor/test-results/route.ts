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

  try {
    const whereClause =
      role === "supervisor"
        ? { user: { supervisorId: session.user.id } }
        : {};

    const results = await prisma.testResult.findMany({
      where: {
        status: "SUBMITTED",
        ...whereClause,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        test: { select: { id: true, title: true, passingScore: true, type: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Fetch test results error:", error);
    return NextResponse.json({ error: "Failed to fetch test results" }, { status: 500 });
  }
}
