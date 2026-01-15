import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateDependencySchema } from "@/lib/validations/dependency";
import { recalculateBlockedStatus } from "@/services/blocked-status";

// GET - Get a specific dependency
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; depId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id: releaseId, depId } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const dependency = await prisma.releaseDependency.findFirst({
      where: {
        id: depId,
        dependentReleaseId: releaseId,
        dependentRelease: { teamId: team.id },
      },
      include: {
        blockingRelease: {
          select: {
            id: true,
            title: true,
            version: true,
            status: true,
            service: {
              select: { name: true, color: true },
            },
          },
        },
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: dependency.id,
      type: dependency.type,
      description: dependency.description,
      isResolved: dependency.isResolved,
      resolvedAt: dependency.resolvedAt,
      createdAt: dependency.createdAt,
      release: dependency.blockingRelease,
    });
  } catch (error) {
    console.error("Error fetching dependency:", error);
    return NextResponse.json(
      { error: "Failed to fetch dependency" },
      { status: 500 }
    );
  }
}

// PATCH - Update a dependency (resolve/unresolve, change type)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; depId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id: releaseId, depId } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const validationResult = updateDependencySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const existingDependency = await prisma.releaseDependency.findFirst({
      where: {
        id: depId,
        dependentReleaseId: releaseId,
        dependentRelease: { teamId: team.id },
      },
    });

    if (!existingDependency) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: {
      type?: "BLOCKS" | "SOFT_DEPENDENCY" | "REQUIRES_SYNC";
      description?: string;
      isResolved?: boolean;
      resolvedAt?: Date | null;
    } = {};

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.isResolved !== undefined) {
      updateData.isResolved = data.isResolved;
      updateData.resolvedAt = data.isResolved ? new Date() : null;
    }

    const dependency = await prisma.releaseDependency.update({
      where: { id: depId },
      data: updateData,
      include: {
        blockingRelease: {
          select: {
            id: true,
            title: true,
            version: true,
            status: true,
            service: {
              select: { name: true, color: true },
            },
          },
        },
      },
    });

    // Recalculate blocked status
    await recalculateBlockedStatus(releaseId);

    // Log activity if resolved status changed
    if (data.isResolved !== undefined) {
      const user = await prisma.user.findUnique({
        where: { clerkUserId: userId },
      });

      if (user) {
        await prisma.activity.create({
          data: {
            teamId: team.id,
            releaseId,
            userId: user.id,
            type: "DEPENDENCY_RESOLVED",
            action: data.isResolved ? "resolved" : "unresolved",
            description: data.isResolved
              ? `Resolved dependency on "${dependency.blockingRelease.title}"`
              : `Unresolved dependency on "${dependency.blockingRelease.title}"`,
            metadata: {
              dependencyId: dependency.id,
              blockingReleaseId: dependency.blockingReleaseId,
            },
          },
        });
      }
    }

    return NextResponse.json({
      id: dependency.id,
      type: dependency.type,
      description: dependency.description,
      isResolved: dependency.isResolved,
      resolvedAt: dependency.resolvedAt,
      createdAt: dependency.createdAt,
      release: dependency.blockingRelease,
    });
  } catch (error) {
    console.error("Error updating dependency:", error);
    return NextResponse.json(
      { error: "Failed to update dependency" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a dependency
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; depId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id: releaseId, depId } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const dependency = await prisma.releaseDependency.findFirst({
      where: {
        id: depId,
        dependentReleaseId: releaseId,
        dependentRelease: { teamId: team.id },
      },
      include: {
        blockingRelease: {
          select: { title: true },
        },
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 }
      );
    }

    await prisma.releaseDependency.delete({
      where: { id: depId },
    });

    // Recalculate blocked status
    await recalculateBlockedStatus(releaseId);

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
          type: "DEPENDENCY_RESOLVED",
          action: "removed",
          description: `Removed dependency on "${dependency.blockingRelease.title}"`,
          metadata: {
            blockingReleaseId: dependency.blockingReleaseId,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dependency:", error);
    return NextResponse.json(
      { error: "Failed to delete dependency" },
      { status: 500 }
    );
  }
}
