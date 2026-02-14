import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Fetch all completed enrollments and test results
        const userData = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                courseEnrollments: {
                    where: { status: "completed" },
                    include: { course: { include: { roadmap: true } } }
                },
                testResults: {
                    where: { status: { in: ["graded", "GRADED"] } },
                    include: { test: { include: { course: { include: { roadmap: true } } } } }
                }
            }
        });

        if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // 2. Map completions to skill categories (using roadmap names or archetypes)
        const skillMap: Record<string, { total: number, count: number }> = {};

        userData.testResults.forEach(result => {
            const category = result.test.course.roadmap?.name || "General";
            if (!skillMap[category]) skillMap[category] = { total: 0, count: 0 };
            skillMap[category].total += (result.score || 0) / 20; // Scale 0-100 to 0-5
            skillMap[category].count++;
        });

        // Handle course completions that might not have tests linked or to weight them
        userData.courseEnrollments.forEach(enroll => {
            const category = enroll.course.roadmap?.name || "General";
            if (!skillMap[category]) skillMap[category] = { total: 0, count: 0 };
            // A completion alone gives a baseline (e.g., 3.0 out of 5)
            skillMap[category].total += 3.5;
            skillMap[category].count++;
        });

        const calculatedSkills = Object.entries(skillMap).map(([name, data]) => ({
            name,
            level: Math.min(Math.round((data.total / data.count) * 10) / 10, 5) // Scale to 5
        }));

        // 3. Persist these skills to the database for historical tracking/referencing
        for (const skill of calculatedSkills) {
            await prisma.skill.upsert({
                where: {
                    userId_name: {
                        userId: session.user.id,
                        name: skill.name
                    }
                },
                update: { level: skill.level },
                create: {
                    userId: session.user.id,
                    name: skill.name,
                    level: skill.level
                }
            });
        }

        return NextResponse.json(calculatedSkills);
    } catch (error) {
        console.error("Skill aggregation error:", error);
        return NextResponse.json({ error: "Failed to calculate skills" }, { status: 500 });
    }
}
