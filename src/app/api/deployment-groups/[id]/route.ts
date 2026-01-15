import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateDeploymentGroupSchema } from "@/lib/validations/deployment-group";
import { ZodError } from "zod";

// GET /api/deployment-groups/[id] - Get a single deployment group with full details
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

    const deploymentGroup = await prisma.deploymentGroup.findFirst({
      where: { id, teamId: team.id },
      include: {
        sprint: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        releases: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!deploymentGroup) {
      return NextResponse.json({ error: "Deployment group not found" }, { status: 404 });
    }

    return NextResponse.json(deploymentGroup);
  } catch (error) {
    console.error("Error fetching deployment group:", error);
    return NextResponse.json(
      { error: "Failed to fetch deployment group" },
      { status: 500 }
    );
  }
}

// PATCH /api/deployment-groups/[id] - Update a deployment group
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

    // Check if deployment group exists and belongs to team
    const existingGroup = await prisma.deploymentGroup.findFirst({
      where: { id, teamId: team.id },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "Deployment group not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateDeploymentGroupSchema.parse(body);

    // Verify sprint belongs to team if updating
    if (validatedData.sprintId) {
      const sprint = await prisma.sprint.findFirst({
        where: { id: validatedData.sprintId, teamId: team.id },
      });

      if (!sprint) {
        return NextResponse.json(
          { error: "Sprint not found" },
          { status: 404 }
        );
      }
    }

    // Verify owner belongs to team if updating
    if (validatedData.ownerId) {
      const owner = await prisma.teamMember.findFirst({
        where: { teamId: team.id, userId: validatedData.ownerId },
      });

      if (!owner) {
        return NextResponse.json(
          { error: "Owner must be a team member" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
    if (validatedData.deployOrder) updateData.deployOrder = validatedData.deployOrder;
    if (validatedData.targetDate !== undefined) {
      updateData.targetDate = validatedData.targetDate ? new Date(validatedData.targetDate) : null;
    }
    if (validatedData.notifyOnReady !== undefined) updateData.notifyOnReady = validatedData.notifyOnReady;
    if (validatedData.sprintId !== undefined) updateData.sprintId = validatedData.sprintId || null;
    if (validatedData.ownerId !== undefined) updateData.ownerId = validatedData.ownerId || null;
    if (validatedData.status) {
      updateData.status = validatedData.status;
      if (validatedData.status === "DEPLOYED") {
        updateData.deployedAt = new Date();
      }
    }

    const deploymentGroup = await prisma.deploymentGroup.update({
      where: { id },
      data: updateData,
      include: {
        sprint: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { releases: true },
        },
      },
    });

    return NextResponse.json(deploymentGroup);
  } catch (error) {
    console.error("Error updating deployment group:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update deployment group" },
      { status: 500 }
    );
  }
}

// DELETE /api/deployment-groups/[id] - Delete a deployment group
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

    // Check if deployment group exists and belongs to team
    const existingGroup = await prisma.deploymentGroup.findFirst({
      where: { id, teamId: team.id },
    });

    if (!existingGroup) {
      return NextResponse.json({ error: "Deployment group not found" }, { status: 404 });
    }

    // Unassign all releases from this group before deleting
    await prisma.release.updateMany({
      where: { deploymentGroupId: id },
      data: { deploymentGroupId: null },
    });

    // Delete the deployment group
    await prisma.deploymentGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting deployment group:", error);
    return NextResponse.json(
      { error: "Failed to delete deployment group" },
      { status: 500 }
    );
  }
}
