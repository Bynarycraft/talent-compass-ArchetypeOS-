import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET reflections for user (placeholder)
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Placeholder: reflection system coming soon
    return NextResponse.json([]);
  } catch (error) {
    console.error("Get reflections error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create reflection (placeholder)
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Placeholder: reflection system coming soon
    return NextResponse.json({ message: "Reflection system coming soon" }, { status: 201 });
  } catch (error) {
    console.error("Create reflection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
