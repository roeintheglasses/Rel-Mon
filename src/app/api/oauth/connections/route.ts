import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get internal user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all OAuth connections for user (excluding sensitive token data)
    const connections = await prisma.oAuthConnection.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        providerEmail: true,
        providerUserId: true,
        resourceUrl: true,
        scopes: true,
        isValid: true,
        lastUsedAt: true,
        lastErrorAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(connections);
  } catch (error) {
    console.error("Error fetching OAuth connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider || !["JIRA", "GITHUB"].includes(provider)) {
      return NextResponse.json(
        { error: "Valid provider required (JIRA or GITHUB)" },
        { status: 400 }
      );
    }

    // Get internal user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete the connection
    await prisma.oAuthConnection.deleteMany({
      where: {
        userId: user.id,
        provider: provider as "JIRA" | "GITHUB",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting OAuth connection:", error);
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
