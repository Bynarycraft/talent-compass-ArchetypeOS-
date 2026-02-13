import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all tests or filter by course
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const tests = await prisma.test.findMany({
      where: courseId ? { courseId } : {},
      include: {
        results: true,
      },
    });

    return NextResponse.json(tests);
  } catch (error) {
    console.error("Get tests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new test (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { courseId, title, type, timeLimit, passingScore, questions, gradingType } = await request.json();

    if (!courseId || !title || !questions) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const test = await prisma.test.create({
      data: {
        courseId,
        title,
        type: type || "mcq",
        timeLimit,
        passingScore: passingScore || 70,
        questions: JSON.stringify(questions),
        gradingType: gradingType || "auto",
      },
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error("Create test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
