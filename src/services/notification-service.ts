import { prisma } from "@/lib/prisma";
import { ReleaseStatus } from "@prisma/client";
import {
  sendSlackMessage,
  buildStatusChangeMessage,
  buildReadyToDeployMessage,
  buildBlockedMessage,
  buildUnblockedMessage,
} from "./slack-client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface NotifyParams {
  teamId: string;
  releaseId: string;
}

/**
 * Get team notification settings
 * @param teamId - The ID of the team
 * @returns Team notification settings including Slack configuration
 */
async function getTeamNotificationSettings(teamId: string) {
  return prisma.team.findUnique({
    where: { id: teamId },
    select: {
      slackWebhookUrl: true,
      slackChannel: true,
      notifyOnStatusChange: true,
      notifyOnBlocked: true,
      notifyOnReadyToDeploy: true,
    },
  });
}

/**
 * Get release with service and owner for notifications
 * @param releaseId - The ID of the release
 * @returns Release with associated service and owner details
 */
async function getReleaseForNotification(releaseId: string) {
  return prisma.release.findUnique({
    where: { id: releaseId },
    include: {
      service: true,
      owner: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Send status change notification to Slack
 * @param params - Notification parameters including teamId, releaseId, fromStatus, and toStatus
 * @param params.teamId - The ID of the team to notify
 * @param params.releaseId - The ID of the release that changed
 * @param params.fromStatus - The previous status
 * @param params.toStatus - The new status
 * @returns Promise that resolves when notification is sent
 */
export async function notifyStatusChange(
  params: NotifyParams & {
    fromStatus: ReleaseStatus;
    toStatus: ReleaseStatus;
  }
): Promise<void> {
  try {
    const settings = await getTeamNotificationSettings(params.teamId);

    if (!settings?.slackWebhookUrl || !settings.notifyOnStatusChange) {
      return;
    }

    const release = await getReleaseForNotification(params.releaseId);
    if (!release) return;

    const message = buildStatusChangeMessage(
      release,
      params.fromStatus,
      params.toStatus,
      APP_URL
    );

    if (settings.slackChannel) {
      message.channel = settings.slackChannel;
    }

    await sendSlackMessage(settings.slackWebhookUrl, message);
  } catch (error) {
    // Log but don't throw - notifications should never break main flow
    console.error("Failed to send status change notification:", error);
  }
}

/**
 * Send ready to deploy notification to Slack
 * @param params - Notification parameters including teamId, releaseId, and environment
 * @param params.teamId - The ID of the team to notify
 * @param params.releaseId - The ID of the release that is ready
 * @param params.environment - The target environment (staging or production)
 * @returns Promise that resolves when notification is sent
 */
export async function notifyReadyToDeploy(
  params: NotifyParams & {
    environment: "staging" | "production";
  }
): Promise<void> {
  try {
    const settings = await getTeamNotificationSettings(params.teamId);

    if (!settings?.slackWebhookUrl || !settings.notifyOnReadyToDeploy) {
      return;
    }

    const release = await getReleaseForNotification(params.releaseId);
    if (!release) return;

    const message = buildReadyToDeployMessage(
      release,
      params.environment,
      APP_URL
    );

    if (settings.slackChannel) {
      message.channel = settings.slackChannel;
    }

    await sendSlackMessage(settings.slackWebhookUrl, message);
  } catch (error) {
    console.error("Failed to send ready to deploy notification:", error);
  }
}

/**
 * Send blocked release notification to Slack
 * @param params - Notification parameters including teamId, releaseId, and reason
 * @param params.teamId - The ID of the team to notify
 * @param params.releaseId - The ID of the release that is blocked
 * @param params.reason - The reason for blocking the release
 * @returns Promise that resolves when notification is sent
 */
export async function notifyBlocked(
  params: NotifyParams & {
    reason: string;
  }
): Promise<void> {
  try {
    const settings = await getTeamNotificationSettings(params.teamId);

    if (!settings?.slackWebhookUrl || !settings.notifyOnBlocked) {
      return;
    }

    const release = await getReleaseForNotification(params.releaseId);
    if (!release) return;

    const message = buildBlockedMessage(release, params.reason, APP_URL);

    if (settings.slackChannel) {
      message.channel = settings.slackChannel;
    }

    await sendSlackMessage(settings.slackWebhookUrl, message);
  } catch (error) {
    console.error("Failed to send blocked notification:", error);
  }
}

/**
 * Send unblocked release notification to Slack
 * @param params - Notification parameters including teamId and releaseId
 * @param params.teamId - The ID of the team to notify
 * @param params.releaseId - The ID of the release that is unblocked
 * @returns Promise that resolves when notification is sent
 */
export async function notifyUnblocked(params: NotifyParams): Promise<void> {
  try {
    const settings = await getTeamNotificationSettings(params.teamId);

    if (!settings?.slackWebhookUrl || !settings.notifyOnBlocked) {
      return;
    }

    const release = await getReleaseForNotification(params.releaseId);
    if (!release) return;

    const message = buildUnblockedMessage(release, APP_URL);

    if (settings.slackChannel) {
      message.channel = settings.slackChannel;
    }

    await sendSlackMessage(settings.slackWebhookUrl, message);
  } catch (error) {
    console.error("Failed to send unblocked notification:", error);
  }
}

/**
 * Check status and send appropriate notifications based on status change
 * @param teamId - The ID of the team to notify
 * @param releaseId - The ID of the release that changed
 * @param fromStatus - The previous status
 * @param toStatus - The new status
 * @returns Promise that resolves when all applicable notifications are sent
 */
export async function handleStatusChangeNotifications(
  teamId: string,
  releaseId: string,
  fromStatus: ReleaseStatus,
  toStatus: ReleaseStatus
): Promise<void> {
  // Send general status change notification
  await notifyStatusChange({
    teamId,
    releaseId,
    fromStatus,
    toStatus,
  });

  // Send ready to deploy notification if applicable
  if (toStatus === "READY_STAGING") {
    await notifyReadyToDeploy({
      teamId,
      releaseId,
      environment: "staging",
    });
  } else if (toStatus === "READY_PRODUCTION" || toStatus === "STAGING_VERIFIED") {
    await notifyReadyToDeploy({
      teamId,
      releaseId,
      environment: "production",
    });
  }
}

/**
 * Handle blocked status change notifications
 * @param teamId - The ID of the team to notify
 * @param releaseId - The ID of the release
 * @param wasBlocked - Whether the release was previously blocked
 * @param isBlocked - Whether the release is currently blocked
 * @param blockedReason - The reason for blocking (if blocked)
 * @returns Promise that resolves when notification is sent
 */
export async function handleBlockedChangeNotifications(
  teamId: string,
  releaseId: string,
  wasBlocked: boolean,
  isBlocked: boolean,
  blockedReason: string | null
): Promise<void> {
  if (!wasBlocked && isBlocked) {
    // Newly blocked
    await notifyBlocked({
      teamId,
      releaseId,
      reason: blockedReason || "Dependencies not met",
    });
  } else if (wasBlocked && !isBlocked) {
    // Unblocked
    await notifyUnblocked({
      teamId,
      releaseId,
    });
  }
}
