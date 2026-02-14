import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;

  try {
    const results = await prisma.testResult.findMany({
      where: {
        userId: session.user.id,
        test: { courseId },
      },
      include: {
        test: {
          select: { id: true, title: true, passingScore: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Fetch test results error:", error);
    return NextResponse.json({ error: "Failed to fetch test results" }, { status: 500 });
  }
}
