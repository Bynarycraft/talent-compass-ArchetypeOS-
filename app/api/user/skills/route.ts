import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET user skills
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const skills = await prisma.skill.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { level: "desc" },
    });

    return NextResponse.json(skills);
  } catch (error) {
    console.error("Get skills error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create or update skill
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, level, proficiency } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find existing skill
    const existingSkill = await prisma.skill.findFirst({
      where: {
        userId: session.user.id,
        name,
      },
    });

    let skill;
    if (existingSkill) {
      skill = await prisma.skill.update({
        where: { id: existingSkill.id },
        data: {
          level: level !== undefined ? level : existingSkill.level,
          proficiency: proficiency !== undefined ? proficiency : existingSkill.proficiency,
          lastUpdated: new Date(),
        },
      });
    } else {
      skill = await prisma.skill.create({
        data: {
          userId: session.user.id,
          name,
          level: level || 0,
          proficiency: proficiency || 0,
        },
      });
    }

    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    console.error("Create skill error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
