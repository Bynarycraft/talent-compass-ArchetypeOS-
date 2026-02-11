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
        const courses = await prisma.course.findMany({
            include: {
                roadmap: true,
                tests: {
                    select: { id: true, title: true, type: true }
                },
                _count: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Transform the response to use enrollments instead of courseEnrollments
        const transformedCourses = courses.map(course => ({
            ...course,
            _count: {
                enrollments: course._count.enrollments
            }
        }));

        return NextResponse.json(transformedCourses);
    } catch (_error) {
        return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role?.toLowerCase();

    // Only Admin/Supervisor can create courses
    if (!session || (role !== "admin" && role !== "supervisor")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await req.json();
        // const archetype = session.user.archetype;
        const { title, description, difficulty, contentType } = body;

        const course = await prisma.course.create({
            data: {
                title,
                description,
                difficulty,
                contentType,
                // Ideally link to a roadmap here via roadmapId if provided
            }
        });

        return NextResponse.json(course);
    } catch (_error) {
        return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }
}
