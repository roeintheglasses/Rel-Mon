import { Release, ReleaseStatus, Service } from "@prisma/client";

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: {
    type: string;
    text?: {
      type: string;
      text: string;
      emoji?: boolean;
    };
    url?: string;
    action_id?: string;
  };
  elements?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
      emoji?: boolean;
    };
    url?: string;
  }>;
}

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
  channel?: string;
}

const STATUS_EMOJI: Record<ReleaseStatus, string> = {
  PLANNING: "📋",
  IN_DEVELOPMENT: "🔨",
  IN_REVIEW: "👀",
  READY_STAGING: "🎯",
  IN_STAGING: "🧪",
  STAGING_VERIFIED: "✅",
  READY_PRODUCTION: "🚀",
  DEPLOYED: "🎉",
  CANCELLED: "❌",
  ROLLED_BACK: "⏪",
};

const STATUS_LABELS: Record<ReleaseStatus, string> = {
  PLANNING: "Planning",
  IN_DEVELOPMENT: "In Development",
  IN_REVIEW: "In Review",
  READY_STAGING: "Ready for Staging",
  IN_STAGING: "In Staging",
  STAGING_VERIFIED: "Staging Verified",
  READY_PRODUCTION: "Ready for Production",
  DEPLOYED: "Deployed",
  CANCELLED: "Cancelled",
  ROLLED_BACK: "Rolled Back",
};

interface ReleaseWithService extends Release {
  service: Service;
  owner?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

/**
 * Sends a message to a Slack webhook
 */
export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Slack webhook error:", errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send Slack message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Builds a Slack message for status change notifications
 */
export function buildStatusChangeMessage(
  release: ReleaseWithService,
  fromStatus: ReleaseStatus,
  toStatus: ReleaseStatus,
  appUrl: string
): SlackMessage {
  const emoji = STATUS_EMOJI[toStatus];
  const ownerName = release.owner
    ? `${release.owner.firstName || ""} ${release.owner.lastName || ""}`.trim() ||
      release.owner.email
    : "Unassigned";

  const releaseUrl = `${appUrl}/releases/${release.id}`;

  return {
    text: `${emoji} Release "${release.title}" status changed to ${STATUS_LABELS[toStatus]}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Status Changed: ${release.title}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Service:*\n${release.service.name}`,
          },
          {
            type: "mrkdwn",
            text: `*Version:*\n${release.version || "N/A"}`,
          },
          {
            type: "mrkdwn",
            text: `*From:*\n${STATUS_LABELS[fromStatus]}`,
          },
          {
            type: "mrkdwn",
            text: `*To:*\n${STATUS_LABELS[toStatus]}`,
          },
          {
            type: "mrkdwn",
            text: `*Owner:*\n${ownerName}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Release",
              emoji: true,
            },
            url: releaseUrl,
          },
        ],
      },
    ],
  };
}

/**
 * Builds a Slack message for ready to deploy notifications
 */
export function buildReadyToDeployMessage(
  release: ReleaseWithService,
  environment: "staging" | "production",
  appUrl: string
): SlackMessage {
  const emoji = environment === "production" ? "🚀" : "🎯";
  const envLabel = environment === "production" ? "Production" : "Staging";
  const ownerName = release.owner
    ? `${release.owner.firstName || ""} ${release.owner.lastName || ""}`.trim() ||
      release.owner.email
    : "Unassigned";

  const releaseUrl = `${appUrl}/releases/${release.id}`;

  return {
    text: `${emoji} Release "${release.title}" is ready for ${envLabel} deployment`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Ready for ${envLabel}: ${release.title}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Service:*\n${release.service.name}`,
          },
          {
            type: "mrkdwn",
            text: `*Version:*\n${release.version || "N/A"}`,
          },
          {
            type: "mrkdwn",
            text: `*Owner:*\n${ownerName}`,
          },
          {
            type: "mrkdwn",
            text: `*Priority:*\n${release.priority}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Release",
              emoji: true,
            },
            url: releaseUrl,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: `View ${envLabel} Queue`,
              emoji: true,
            },
            url: `${appUrl}/ready-to-deploy`,
          },
        ],
      },
    ],
  };
}

/**
 * Builds a Slack message for blocked release notifications
 */
export function buildBlockedMessage(
  release: ReleaseWithService,
  reason: string,
  appUrl: string
): SlackMessage {
  const ownerName = release.owner
    ? `${release.owner.firstName || ""} ${release.owner.lastName || ""}`.trim() ||
      release.owner.email
    : "Unassigned";

  const releaseUrl = `${appUrl}/releases/${release.id}`;

  return {
    text: `⚠️ Release "${release.title}" is now blocked`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `⚠️ Release Blocked: ${release.title}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Reason:* ${reason}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Service:*\n${release.service.name}`,
          },
          {
            type: "mrkdwn",
            text: `*Version:*\n${release.version || "N/A"}`,
          },
          {
            type: "mrkdwn",
            text: `*Owner:*\n${ownerName}`,
          },
          {
            type: "mrkdwn",
            text: `*Status:*\n${STATUS_LABELS[release.status]}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Release",
              emoji: true,
            },
            url: releaseUrl,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View All Blocked",
              emoji: true,
            },
            url: `${appUrl}/blocked`,
          },
        ],
      },
    ],
  };
}

/**
 * Builds a Slack message for unblocked release notifications
 */
export function buildUnblockedMessage(
  release: ReleaseWithService,
  appUrl: string
): SlackMessage {
  const ownerName = release.owner
    ? `${release.owner.firstName || ""} ${release.owner.lastName || ""}`.trim() ||
      release.owner.email
    : "Unassigned";

  const releaseUrl = `${appUrl}/releases/${release.id}`;

  return {
    text: `✅ Release "${release.title}" is no longer blocked`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `✅ Release Unblocked: ${release.title}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Service:*\n${release.service.name}`,
          },
          {
            type: "mrkdwn",
            text: `*Status:*\n${STATUS_LABELS[release.status]}`,
          },
          {
            type: "mrkdwn",
            text: `*Owner:*\n${ownerName}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Release",
              emoji: true,
            },
            url: releaseUrl,
          },
        ],
      },
    ],
  };
}
