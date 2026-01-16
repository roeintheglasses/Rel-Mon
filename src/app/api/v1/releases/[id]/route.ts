import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/public-api-handler";
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

// GET /api/v1/releases/[id] - Get a single release with full details
export const GET = withApiAuth(async (request: NextRequest, { team, params }) => {
  try {
    const { id } = await params;

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
      return NextResponse.json(
        { error: "Release not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(release);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch release" },
      { status: 500 }
    );
  }
});

// PATCH /api/v1/releases/[id] - Update a release
export const PATCH = withApiAuth(async (request: NextRequest, { team, params, apiKey }) => {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validation = updateReleaseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get the current release
    const oldRelease = await prisma.release.findFirst({
      where: { id, teamId: team.id },
      select: {
        id: true,
        title: true,
        status: true,
        isBlocked: true,
        blockedReason: true,
        deploymentGroupId: true,
      },
    });

    if (!oldRelease) {
      return NextResponse.json(
        { error: "Release not found" },
        { status: 404 }
      );
    }

    // Track changes for activity log
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    // Handle each field
    if (data.title !== undefined && data.title !== oldRelease.title) {
      changes.title = { from: oldRelease.title, to: data.title };
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.serviceId !== undefined) {
      updateData.serviceId = data.serviceId;
    }

    if (data.sprintId !== undefined) {
      updateData.sprintId = data.sprintId;
    }

    if (data.version !== undefined) {
      updateData.version = data.version;
    }

    if (data.targetDate !== undefined) {
      const targetDate = data.targetDate ? new Date(data.targetDate) : null;
      updateData.targetDate = targetDate;
    }

    // Handle status change
    const statusChanged = data.status && data.status !== oldRelease.status;
    if (statusChanged) {
      changes.status = { from: oldRelease.status, to: data.status };
      updateData.status = data.status;

      // Set deployedAt timestamp if status is DEPLOYED
      if (data.status === "DEPLOYED") {
        updateData.deployedAt = new Date();
      }
    }

    // Handle blocked status change
    const blockedChanged =
      data.isBlocked !== undefined && data.isBlocked !== oldRelease.isBlocked;
    if (blockedChanged) {
      changes.isBlocked = { from: oldRelease.isBlocked, to: data.isBlocked };
      updateData.isBlocked = data.isBlocked;
    }

    if (data.blockedReason !== undefined) {
      updateData.blockedReason = data.blockedReason;
    }

    // Update the release
    const updatedRelease = await prisma.release.update({
      where: { id },
      data: updateData,
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
      },
    });

    // Create activity log
    if (Object.keys(changes).length > 0) {
      await prisma.activity.create({
        data: {
          releaseId: id,
          type: "RELEASE_UPDATED",
          description: `Release updated via API (Key: ${apiKey.name})`,
          metadata: changes,
        },
      });
    }

    // Handle deployment group status update if status changed
    if (statusChanged && oldRelease.deploymentGroupId) {
      await updateDeploymentGroupStatus(oldRelease.deploymentGroupId);
    }

    // Send notifications if status changed
    if (statusChanged) {
      await handleStatusChangeNotifications(
        team.id,
        id,
        oldRelease.status as ReleaseStatus,
        data.status as ReleaseStatus
      );
    }

    // Send blocked/unblocked notifications
    if (blockedChanged) {
      await handleBlockedChangeNotifications(
        team.id,
        id,
        oldRelease.isBlocked,
        data.isBlocked!,
        data.blockedReason ?? null
      );
    }

    // If status changed to DEPLOYED or CANCELLED, recalculate dependent blocked status
    if (
      statusChanged &&
      (data.status === "DEPLOYED" || data.status === "CANCELLED")
    ) {
      await recalculateDependentBlockedStatus(id);
    }

    return NextResponse.json(updatedRelease);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update release" },
      { status: 500 }
    );
  }
});
