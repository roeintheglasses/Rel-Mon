import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateReleaseSchema, ReleaseStatus } from "@/lib/validations/release";

// Helper to recalculate blocked status for releases that depend on a given release
async function recalculateDependentBlockedStatus(
  blockingReleaseId: string
): Promise<void> {
  // Find all releases that depend on this release
  const dependentReleases = await prisma.releaseDependency.findMany({
    where: { blockingReleaseId },
    select: { dependentReleaseId: true },
  });

  for (const dep of dependentReleases) {
    await recalculateBlockedStatus(dep.dependentReleaseId);
  }
}

// Helper to recalculate blocked status for a specific release
async function recalculateBlockedStatus(releaseId: string): Promise<void> {
  const unresolvedBlockers = await prisma.releaseDependency.findFirst({
    where: {
      dependentReleaseId: releaseId,
      type: "BLOCKS",
      isResolved: false,
      blockingRelease: {
        status: {
          notIn: ["DEPLOYED", "CANCELLED"],
        },
      },
    },
    include: {
      blockingRelease: {
        select: { title: true, status: true },
      },
    },
  });

  const isBlocked = !!unresolvedBlockers;
  const blockedReason = unresolvedBlockers
    ? `Blocked by: ${unresolvedBlockers.blockingRelease.title} (${unresolvedBlockers.blockingRelease.status})`
    : null;

  await prisma.release.update({
    where: { id: releaseId },
    data: { isBlocked, blockedReason },
  });
}

// Helper to update deployment group status based on child releases
async function updateDeploymentGroupStatus(
  deploymentGroupId: string
): Promise<void> {
  const group = await prisma.deploymentGroup.findUnique({
    where: { id: deploymentGroupId },
    include: {
      releases: {
        select: { status: true },
      },
    },
  });

  if (!group || group.releases.length === 0) return;

  const statuses = group.releases.map((r) => r.status);

  let newStatus: "PENDING" | "READY" | "DEPLOYING" | "DEPLOYED" | "CANCELLED" =
    group.status;

  // All deployed = group deployed
  if (statuses.every((s) => s === "DEPLOYED")) {
    newStatus = "DEPLOYED";
  }
  // Any in staging or production states = deploying
  else if (
    statuses.some((s) =>
      ["IN_STAGING", "STAGING_VERIFIED", "READY_PRODUCTION"].includes(s)
    )
  ) {
    newStatus = "DEPLOYING";
  }
  // All ready for staging or beyond = ready
  else if (
    statuses.every((s) =>
      [
        "READY_STAGING",
        "IN_STAGING",
        "STAGING_VERIFIED",
        "READY_PRODUCTION",
        "DEPLOYED",
      ].includes(s)
    )
  ) {
    newStatus = "READY";
  }
  // Otherwise pending
  else {
    newStatus = "PENDING";
  }

  if (newStatus !== group.status) {
    await prisma.deploymentGroup.update({
      where: { id: deploymentGroupId },
      data: {
        status: newStatus,
        deployedAt: newStatus === "DEPLOYED" ? new Date() : group.deployedAt,
      },
    });
  }
}

// GET /api/releases/[id] - Get a single release with full details
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

    const release = await prisma.release.findFirst({
      where: { id, teamId: team.id },
      include: {
        service: true,
        sprint: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        items: {
          orderBy: { createdAt: "desc" },
        },
        dependsOn: {
          include: {
            blockingRelease: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
        dependents: {
          include: {
            dependentRelease: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    return NextResponse.json(release);
  } catch (error) {
    console.error("Error fetching release:", error);
    return NextResponse.json(
      { error: "Failed to fetch release" },
      { status: 500 }
    );
  }
}

// PATCH /api/releases/[id] - Update a release
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

    // Check if release exists and belongs to team
    const existingRelease = await prisma.release.findFirst({
      where: { id, teamId: team.id },
    });

    if (!existingRelease) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateReleaseSchema.parse(body);

    // Verify service belongs to team if updating
    if (validatedData.serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: validatedData.serviceId, teamId: team.id },
      });

      if (!service) {
        return NextResponse.json(
          { error: "Service not found" },
          { status: 404 }
        );
      }
    }

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

    const updateData: Record<string, unknown> = {};
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
    if (validatedData.version !== undefined) updateData.version = validatedData.version || null;
    if (validatedData.targetDate !== undefined) {
      updateData.targetDate = validatedData.targetDate ? new Date(validatedData.targetDate) : null;
    }
    if (validatedData.serviceId) updateData.serviceId = validatedData.serviceId;
    if (validatedData.sprintId !== undefined) updateData.sprintId = validatedData.sprintId || null;
    if (validatedData.status) {
      updateData.status = validatedData.status;
      updateData.statusChangedAt = new Date();

      // Set deployment timestamps
      if (validatedData.status === "IN_STAGING" && !existingRelease.stagingDeployedAt) {
        updateData.stagingDeployedAt = new Date();
      }
      if (validatedData.status === "DEPLOYED" && !existingRelease.prodDeployedAt) {
        updateData.prodDeployedAt = new Date();
      }
    }

    const release = await prisma.release.update({
      where: { id },
      data: updateData,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
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
      },
    });

    // If status changed to DEPLOYED or CANCELLED, recalculate blocked status for dependent releases
    if (
      validatedData.status &&
      validatedData.status !== existingRelease.status &&
      (validatedData.status === "DEPLOYED" || validatedData.status === "CANCELLED")
    ) {
      await recalculateDependentBlockedStatus(id);
    }

    // If release is in a deployment group, update the group status
    if (existingRelease.deploymentGroupId && validatedData.status) {
      await updateDeploymentGroupStatus(existingRelease.deploymentGroupId);
    }

    return NextResponse.json(release);
  } catch (error) {
    console.error("Error updating release:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update release" },
      { status: 500 }
    );
  }
}

// DELETE /api/releases/[id] - Delete a release
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

    // Check if release exists and belongs to team
    const existingRelease = await prisma.release.findFirst({
      where: { id, teamId: team.id },
    });

    if (!existingRelease) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    // Delete the release (cascades will handle related records)
    await prisma.release.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting release:", error);
    return NextResponse.json(
      { error: "Failed to delete release" },
      { status: 500 }
    );
  }
}
