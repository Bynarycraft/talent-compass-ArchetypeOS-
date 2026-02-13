import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET roadmaps
export async function GET(_request: NextRequest) {
  try {
    const roadmaps = await prisma.roadmap.findMany({
      include: {
        modules: {
          include: {
            courses: true,
          },
        },
      },
    });

    return NextResponse.json(roadmaps);
  } catch (error) {
    console.error("Get roadmaps error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create roadmap (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, archetype } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const roadmap = await prisma.roadmap.create({
      data: {
        name,
        archetype,
      },
    });

    return NextResponse.json(roadmap, { status: 201 });
  } catch (error) {
    console.error("Create roadmap error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
