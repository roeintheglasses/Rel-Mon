import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateSprintSchema } from "@/lib/validations/sprint";

// GET /api/sprints/[id] - Get a single sprint
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    const { id } = await params;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const sprint = await prisma.sprint.findFirst({
      where: { id, teamId: team.id },
      include: {
        _count: {
          select: { releases: true },
        },
        releases: {
          include: {
            service: true,
            owner: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("Error fetching sprint:", error);
    return NextResponse.json(
      { error: "Failed to fetch sprint" },
      { status: 500 }
    );
  }
}

// PATCH /api/sprints/[id] - Update a sprint
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    const { id } = await params;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if sprint exists and belongs to team
    const existingSprint = await prisma.sprint.findFirst({
      where: { id, teamId: team.id },
    });

    if (!existingSprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateSprintSchema.parse(body);

    // Validate dates if both are provided
    if (validatedData.startDate && validatedData.endDate) {
      const startDate = new Date(validatedData.startDate);
      const endDate = new Date(validatedData.endDate);
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.startDate) updateData.startDate = new Date(validatedData.startDate);
    if (validatedData.endDate) updateData.endDate = new Date(validatedData.endDate);
    if (validatedData.goal !== undefined) updateData.goal = validatedData.goal || null;
    if (validatedData.status) updateData.status = validatedData.status;

    const sprint = await prisma.sprint.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(sprint);
  } catch (error) {
    console.error("Error updating sprint:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update sprint" },
      { status: 500 }
    );
  }
}

// DELETE /api/sprints/[id] - Delete a sprint
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    const { id } = await params;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if sprint exists and belongs to team
    const existingSprint = await prisma.sprint.findFirst({
      where: { id, teamId: team.id },
      include: {
        _count: {
          select: { releases: true },
        },
      },
    });

    if (!existingSprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // Prevent deletion if sprint has releases
    if (existingSprint._count.releases > 0) {
      return NextResponse.json(
        { error: "Cannot delete sprint with existing releases. Remove releases first." },
        { status: 400 }
      );
    }

    await prisma.sprint.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sprint:", error);
    return NextResponse.json(
      { error: "Failed to delete sprint" },
      { status: 500 }
    );
  }
}
