import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || (role !== "admin" && role !== "supervisor")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;

  try {
    const body = await req.json();
    const { decision } = body || {};

    if (!decision || !["accept", "reject"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, supervisorId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (role === "supervisor" && user.supervisorId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (user.role !== "candidate") {
      return NextResponse.json({ error: "Only candidates can be reviewed" }, { status: 400 });
    }

    if (decision === "accept") {
      await prisma.user.update({
        where: { id: userId },
        data: { role: "learner" },
      });
    }

    const details = {
      title: "Application Update",
      message:
        decision === "accept"
          ? "Congratulations! You have been accepted as a learner."
          : "Your application is under review and has been marked as not accepted at this time.",
      priority: decision === "accept" ? "low" : "normal",
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
    };

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "notification",
        targetType: "user",
        targetId: userId,
        details: JSON.stringify(details),
      },
    });

    return NextResponse.json({ success: true, decision });
  } catch (error) {
    console.error("Candidate decision error:", error);
    return NextResponse.json({ error: "Failed to update candidate" }, { status: 500 });
  }
}
