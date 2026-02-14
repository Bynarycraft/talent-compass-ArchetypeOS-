import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ testId: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testId } = await params;

    try {
        const test = await prisma.test.findUnique({
            where: { id: testId },
        });

        if (!test) {
            return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
        }

        const role = session.user.role?.toLowerCase();
        if (role !== "admin" && role !== "supervisor") {
            const enrollment = await prisma.courseEnrollment.findUnique({
                where: {
                    userId_courseId: {
                        userId: session.user.id,
                        courseId: test.courseId,
                    },
                },
            });

            if (!enrollment) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
            }
        }

        let parsedQuestions: unknown = [];
        try {
            parsedQuestions = JSON.parse(test.questions || "[]");
        } catch (_error) {
            parsedQuestions = [];
        }

        return NextResponse.json({
            ...test,
            questions: parsedQuestions,
            timeLimitMinutes: test.timeLimit,
        });
    } catch (error) {
        console.error("Test fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch assessment" }, { status: 500 });
    }
}
