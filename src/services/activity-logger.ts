import { prisma } from "@/lib/prisma";
import { ActivityType, Prisma } from "@prisma/client";

interface LogActivityParams {
  teamId: string;
  releaseId?: string;
  userId?: string;
  type: ActivityType;
  action: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Logs an activity for audit trail purposes.
 * This function is fire-and-forget - it won't throw errors.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        teamId: params.teamId,
        releaseId: params.releaseId,
        userId: params.userId,
        type: params.type,
        action: params.action,
        description: params.description,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    // Log error but don't throw - activity logging should never break main operations
    console.error("Failed to log activity:", error);
  }
}

/**
 * Helper functions for common activity types
 */
export const ActivityLogger = {
  releaseCreated: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    releaseTitle: string;
    serviceName: string;
  }) =>
    logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "RELEASE_CREATED",
      action: "created",
      description: `Created release "${params.releaseTitle}" for ${params.serviceName}`,
      metadata: {
        title: params.releaseTitle,
        service: params.serviceName,
      },
    }),

  releaseUpdated: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    releaseTitle: string;
    changes: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>;
  }) => {
    const changeDescriptions = Object.entries(params.changes)
      .map(([field, { from, to }]) => `${field}: ${from} → ${to}`)
      .join(", ");

    return logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "RELEASE_UPDATED",
      action: "updated",
      description: `Updated release "${params.releaseTitle}": ${changeDescriptions}`,
      metadata: {
        changes: params.changes as Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>,
      },
    });
  },

  statusChanged: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    releaseTitle: string;
    fromStatus: string;
    toStatus: string;
  }) =>
    logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "STATUS_CHANGED",
      action: "status changed",
      description: `Changed status of "${params.releaseTitle}" from ${params.fromStatus} to ${params.toStatus}`,
      metadata: {
        fromStatus: params.fromStatus,
        toStatus: params.toStatus,
      },
    }),

  itemAdded: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    itemType: "JIRA_TICKET" | "GITHUB_PR";
    externalId: string;
    itemId: string;
  }) =>
    logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "ITEM_ADDED",
      action: "added",
      description: `Added ${params.itemType === "JIRA_TICKET" ? "Jira ticket" : "GitHub PR"} ${params.externalId}`,
      metadata: {
        itemId: params.itemId,
        type: params.itemType,
        externalId: params.externalId,
      },
    }),

  itemRemoved: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    itemType: "JIRA_TICKET" | "GITHUB_PR";
    externalId: string;
  }) =>
    logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "ITEM_REMOVED",
      action: "removed",
      description: `Removed ${params.itemType === "JIRA_TICKET" ? "Jira ticket" : "GitHub PR"} ${params.externalId}`,
      metadata: {
        type: params.itemType,
        externalId: params.externalId,
      },
    }),

  dependencyAdded: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    blockingReleaseTitle: string;
    dependencyType: string;
  }) =>
    logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "DEPENDENCY_ADDED",
      action: "added dependency",
      description: `Added ${params.dependencyType} dependency on "${params.blockingReleaseTitle}"`,
      metadata: {
        blockingReleaseTitle: params.blockingReleaseTitle,
        dependencyType: params.dependencyType,
      },
    }),

  dependencyResolved: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    blockingReleaseTitle: string;
  }) =>
    logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "DEPENDENCY_RESOLVED",
      action: "resolved dependency",
      description: `Resolved dependency on "${params.blockingReleaseTitle}"`,
      metadata: {
        blockingReleaseTitle: params.blockingReleaseTitle,
      },
    }),

  commentAdded: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    commentId: string;
  }) =>
    logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "COMMENT_ADDED",
      action: "commented",
      description: "Added a comment",
      metadata: {
        commentId: params.commentId,
      },
    }),

  deploymentGroupAssigned: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    releaseTitle: string;
    groupName: string;
  }) =>
    logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "DEPLOYMENT_GROUP_ASSIGNED",
      action: "assigned to group",
      description: `Assigned "${params.releaseTitle}" to deployment group "${params.groupName}"`,
      metadata: {
        groupName: params.groupName,
      },
    }),

  userAssigned: (params: {
    teamId: string;
    releaseId: string;
    userId: string;
    releaseTitle: string;
    assignedUserName: string;
  }) =>
    logActivity({
      teamId: params.teamId,
      releaseId: params.releaseId,
      userId: params.userId,
      type: "USER_ASSIGNED",
      action: "assigned",
      description: `Assigned "${params.releaseTitle}" to ${params.assignedUserName}`,
      metadata: {
        assignedUserName: params.assignedUserName,
      },
    }),
};

/**
 * Fetches recent activities for a release
 */
export async function getActivitiesForRelease(
  releaseId: string,
  limit: number = 50
) {
  return prisma.activity.findMany({
    where: { releaseId },
    orderBy: { createdAt: "desc" },
    take: limit,
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
  });
}

/**
 * Fetches recent activities for a team
 */
export async function getActivitiesForTeam(teamId: string, limit: number = 100) {
  return prisma.activity.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
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
      release: {
        select: {
          id: true,
          title: true,
          service: {
            select: {
              name: true,
              color: true,
            },
          },
        },
      },
    },
  });
}
