import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateReleaseSchema, ReleaseStatus } from "@/lib/validations/release";
import { recalculateDependentBlockedStatus } from "@/services/blocked-status";
import {
  handleStatusChangeNotifications,
  handleBlockedChangeNotifications,
} from "@/services/notification-service";

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

  const allStatuses = group.releases.map((r) => r.status);

  // Filter out CANCELLED releases for status calculation
  const nonCancelledStatuses = allStatuses.filter((s) => s !== "CANCELLED");

  let newStatus: "PENDING" | "READY" | "DEPLOYING" | "DEPLOYED" | "CANCELLED" =
    group.status;

  // If all releases are cancelled, group is cancelled
  if (nonCancelledStatuses.length === 0) {
    newStatus = "CANCELLED";
  }
  // All non-cancelled deployed = group deployed
  else if (nonCancelledStatuses.every((s) => s === "DEPLOYED")) {
    newStatus = "DEPLOYED";
  }
  // All non-cancelled are ready for staging = ready (check this BEFORE deploying)
  else if (nonCancelledStatuses.every((s) => s === "READY_STAGING")) {
    newStatus = "READY";
  }
  // Any in staging or production states = deploying
  else if (
    nonCancelledStatuses.some((s) =>
      ["IN_STAGING", "STAGING_VERIFIED", "READY_PRODUCTION"].includes(s)
    )
  ) {
    newStatus = "DEPLOYING";
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
    if (validatedData.isBlocked !== undefined) {
      updateData.isBlocked = validatedData.isBlocked;
    }
    if (validatedData.blockedReason !== undefined) {
      updateData.blockedReason = validatedData.blockedReason;
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
      try {
        await recalculateDependentBlockedStatus(id);
      } catch (err) {
        console.error("Failed to recalculate dependent blocked status:", err);
        // Continue - main operation succeeded
      }
    }

    // If release is in a deployment group, update the group status
    if (existingRelease.deploymentGroupId && validatedData.status) {
      try {
        await updateDeploymentGroupStatus(existingRelease.deploymentGroupId);
      } catch (err) {
        console.error("Failed to update deployment group status:", err);
        // Continue - main operation succeeded
      }
    }

    // Send Slack notifications (fire-and-forget)
    if (validatedData.status && validatedData.status !== existingRelease.status) {
      handleStatusChangeNotifications(
        team.id,
        id,
        existingRelease.status as ReleaseStatus,
        validatedData.status as ReleaseStatus
      ).catch((err) => {
        console.error("Failed to send status change notification:", err);
      });
    }

    // Handle blocked status change notifications
    if (validatedData.isBlocked !== undefined && validatedData.isBlocked !== existingRelease.isBlocked) {
      handleBlockedChangeNotifications(
        team.id,
        id,
        existingRelease.isBlocked,
        validatedData.isBlocked,
        validatedData.blockedReason || null
      ).catch((err) => {
        console.error("Failed to send blocked change notification:", err);
      });
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
