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
 * Send status change notification
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
 * Send ready to deploy notification
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
 * Send blocked release notification
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
 * Send unblocked release notification
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
 * Check status and send appropriate notifications
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
