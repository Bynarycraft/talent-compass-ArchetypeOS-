import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const skillsParam = url.searchParams.get("skills") || "";
    const mode = url.searchParams.get("mode") || "and";
    const skills = skillsParam
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (skills.length === 0) {
      return NextResponse.json([]);
    }

    const matches = await prisma.skill.findMany({
      where: {
        name: { in: skills },
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    const grouped = matches.reduce<Record<string, typeof matches>>((acc, skill) => {
      if (!acc[skill.userId]) acc[skill.userId] = [];
      acc[skill.userId].push(skill);
      return acc;
    }, {});

    const result = Object.values(grouped)
      .filter((userSkills) => {
        if (mode === "or") return true;
        const names = userSkills.map((skill) => skill.name.toLowerCase());
        return skills.every((s) => names.includes(s.toLowerCase()));
      })
      .map((userSkills) => ({
        user: userSkills[0].user,
        skills: userSkills.map((skill) => ({ name: skill.name, level: skill.level })),
      }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Skill search error:", error);
    return NextResponse.json({ error: "Failed to search skills" }, { status: 500 });
  }
}
