import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(_req: Request) {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role?.toLowerCase();

    if (!session || role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                archetype: true,
                createdAt: true,
            }
        });

        return NextResponse.json(users);
    } catch (_error) {
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}
