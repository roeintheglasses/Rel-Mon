import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addItemSchema = z.object({
  type: z.enum(["JIRA_TICKET", "GITHUB_PR"]),
  externalId: z.string().min(1),
  externalUrl: z.string().url().optional(),
  title: z.string().optional(),
  status: z.string().optional(),
  assignee: z.string().optional(),
});

// GET - List items for a release
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id: releaseId } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the release belongs to the team
    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const release = await prisma.release.findFirst({
      where: { id: releaseId, teamId: team.id },
    });

    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const items = await prisma.releaseItem.findMany({
      where: { releaseId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching release items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

// POST - Add item to release
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id: releaseId } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = addItemSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify the release belongs to the team
    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const release = await prisma.release.findFirst({
      where: { id: releaseId, teamId: team.id },
    });

    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    // Check if item already exists
    const existingItem = await prisma.releaseItem.findUnique({
      where: {
        releaseId_type_externalId: {
          releaseId,
          type: data.type,
          externalId: data.externalId,
        },
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "Item already linked to this release" },
        { status: 409 }
      );
    }

    // Create the item
    const item = await prisma.releaseItem.create({
      data: {
        releaseId,
        type: data.type,
        externalId: data.externalId,
        externalUrl: data.externalUrl,
        title: data.title,
        status: data.status,
        assignee: data.assignee,
        lastSyncedAt: new Date(),
      },
    });

    // Log activity
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (user) {
      await prisma.activity.create({
        data: {
          teamId: team.id,
          releaseId,
          userId: user.id,
          type: "ITEM_ADDED",
          action: "added",
          description: `Added ${data.type === "JIRA_TICKET" ? "Jira ticket" : "GitHub PR"} ${data.externalId}`,
          metadata: {
            itemId: item.id,
            type: data.type,
            externalId: data.externalId,
          },
        },
      });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding release item:", error);
    return NextResponse.json(
      { error: "Failed to add item" },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from release
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id: releaseId } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    // Verify the release belongs to the team
    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const release = await prisma.release.findFirst({
      where: { id: releaseId, teamId: team.id },
    });

    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    // Find and delete the item
    const item = await prisma.releaseItem.findFirst({
      where: { id: itemId, releaseId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.releaseItem.delete({
      where: { id: itemId },
    });

    // Log activity
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (user) {
      await prisma.activity.create({
        data: {
          teamId: team.id,
          releaseId,
          userId: user.id,
          type: "ITEM_REMOVED",
          action: "removed",
          description: `Removed ${item.type === "JIRA_TICKET" ? "Jira ticket" : "GitHub PR"} ${item.externalId}`,
          metadata: {
            type: item.type,
            externalId: item.externalId,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing release item:", error);
    return NextResponse.json(
      { error: "Failed to remove item" },
      { status: 500 }
    );
  }
}
