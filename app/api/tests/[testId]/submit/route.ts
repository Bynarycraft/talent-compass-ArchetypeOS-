import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ testId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { testId } = await params;

    try {
        const body = await req.json();
        const { answers, startedAt } = body; // answers = { "0": 1, "1": 0 } - index based

        const test = await prisma.test.findUnique({
            where: { id: testId },
            include: { course: true }
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

        let score = 0;
        let status: "SUBMITTED" | "GRADED" = "SUBMITTED";
        interface Question {
            correct: number;
        }

        let questions: Question[] = [];
        try {
            questions = JSON.parse(test.questions || "[]") as Question[];
        } catch (_error) {
            questions = [];
        }

        const attemptLimit = test.attemptLimit || 1;
        const inProgressAttempt = await prisma.testResult.findFirst({
            where: {
                testId,
                userId: session.user.id,
                status: "IN_PROGRESS",
            },
            orderBy: { createdAt: "desc" },
        });
        const completedAttempts = await prisma.testResult.count({
            where: {
                testId,
                userId: session.user.id,
                status: { not: "IN_PROGRESS" },
            },
        });

        if (!inProgressAttempt && completedAttempts >= attemptLimit) {
            return NextResponse.json({ error: "Attempt limit reached" }, { status: 400 });
        }

        const attemptNumber = inProgressAttempt?.attemptNumber ?? completedAttempts + 1;

        // 1. Grading logic for MCQ
        if (test.type === "MCQ" && questions.length > 0) {
            let correctCount = 0;
            questions.forEach((q, idx) => {
                if (answers[idx] === q.correct) {
                    correctCount++;
                }
            });
            score = Math.round((correctCount / questions.length) * 100);
            status = "GRADED";
        }

        const passingScore = test.passingScore || 70;

        // 2. Save result
        const result = inProgressAttempt
            ? await prisma.testResult.update({
                where: { id: inProgressAttempt.id },
                data: {
                    answers,
                    score,
                    status,
                    submittedAt: new Date(),
                    startedAt: inProgressAttempt.startedAt || (startedAt ? new Date(startedAt) : new Date()),
                },
            })
            : await prisma.testResult.create({
                data: {
                    testId,
                    userId: session.user.id,
                    answers,
                    score,
                    status,
                    attemptNumber,
                    startedAt: startedAt ? new Date(startedAt) : new Date(),
                    submittedAt: new Date(),
                }
            });

        if (session.user.role === "candidate") {
            const details = {
                title: status === "GRADED" ? "Assessment Result" : "Assessment Submitted",
                message:
                    status === "GRADED"
                        ? score >= passingScore
                            ? `Passed with ${score}%`
                            : `Needs improvement: ${score}%`
                        : "Your assessment is pending review.",
                priority: status === "GRADED" && score >= passingScore ? "low" : "normal",
                createdBy: "system",
                createdAt: new Date().toISOString(),
            };

            await prisma.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: "notification",
                    targetType: "user",
                    targetId: session.user.id,
                    details: JSON.stringify(details),
                },
            });
        }

        // 3. Logic: If passed, mark course enrollment as "completed"
        if (score >= passingScore) {
            await prisma.courseEnrollment.updateMany({
                where: {
                    userId: session.user.id,
                    courseId: test.courseId
                },
                data: {
                    status: "completed",
                    progress: 100,
                    completedAt: new Date()
                }
            });

            const existing = await prisma.auditLog.findFirst({
                where: {
                    userId: session.user.id,
                    action: "certificate",
                    targetId: test.courseId,
                },
            });

            if (!existing) {
                await prisma.auditLog.create({
                    data: {
                        userId: session.user.id,
                        action: "certificate",
                        targetType: "course",
                        targetId: test.courseId,
                        details: "Course completed",
                    },
                });
            }

            // 4. Update role to learner if candidate passed
            if (session.user.role === "candidate") {
                await prisma.user.update({
                    where: { id: session.user.id },
                    data: { role: "learner" }
                });
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Submission error:", error);
        return NextResponse.json({ error: "Failed to submit assessment" }, { status: 500 });
    }
}
