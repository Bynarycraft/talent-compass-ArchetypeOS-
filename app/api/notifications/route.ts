import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type NotificationDetails = {
  title?: string;
  message?: string;
  priority?: string;
  createdBy?: string;
  createdAt?: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: "notification",
        targetId: session.user.id,
      },
      orderBy: { timestamp: "desc" },
      take: 50,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const notifications = logs.map((log) => {
      let details: NotificationDetails | null = null;
      if (log.details) {
        try {
          details = JSON.parse(log.details) as NotificationDetails;
        } catch (_error) {
          details = { message: log.details };
        }
      }

      return {
        ...log,
        details,
      };
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role?.toLowerCase();

  if (!session || (role !== "admin" && role !== "supervisor")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { receiverId, receiverIds, title, message, priority = "normal" } = body || {};

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const details: NotificationDetails = {
      title,
      message,
      priority,
      createdBy: session.user.id,
      createdAt: new Date().toISOString(),
    };

    let targetIds: string[] = [];

    if (Array.isArray(receiverIds) && receiverIds.length > 0) {
      targetIds = receiverIds as string[];
    } else if (receiverId === "all") {
      if (role === "supervisor") {
        const learners = await prisma.user.findMany({
          where: { supervisorId: session.user.id },
          select: { id: true },
        });
        targetIds = learners.map((learner) => learner.id);
      } else {
        const learners = await prisma.user.findMany({
          where: { role: { in: ["candidate", "learner"] } },
          select: { id: true },
        });
        targetIds = learners.map((learner) => learner.id);
      }
    } else if (receiverId) {
      targetIds = [receiverId];
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "No recipients resolved" }, { status: 400 });
    }

    if (targetIds.length === 1) {
      const notification = await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "notification",
          targetType: "user",
          targetId: targetIds[0],
          details: JSON.stringify(details),
        },
      });

      return NextResponse.json(notification, { status: 201 });
    }

    const result = await prisma.auditLog.createMany({
      data: targetIds.map((targetId) => ({
        userId: session.user.id,
        action: "notification",
        targetType: "user",
        targetId,
        details: JSON.stringify(details),
      })),
    });

    return NextResponse.json({ count: result.count }, { status: 201 });
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
