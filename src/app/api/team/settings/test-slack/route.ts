import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { sendSlackMessage } from "@/services/slack-client";

// POST - Test Slack webhook
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        name: true,
        slackWebhookUrl: true,
        slackChannel: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (!team.slackWebhookUrl) {
      return NextResponse.json(
        { error: "Slack webhook URL not configured" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const result = await sendSlackMessage(team.slackWebhookUrl, {
      text: `✅ Test notification from Release Coordinator`,
      channel: team.slackChannel || undefined,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "✅ Test Notification",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `This is a test notification from *${team.name}* on Release Coordinator.\n\nIf you see this message, your Slack integration is working correctly!`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Open Release Coordinator",
                emoji: true,
              },
              url: appUrl,
            },
          ],
        },
      ],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send test message" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error testing Slack webhook:", error);
    return NextResponse.json(
      { error: "Failed to test webhook" },
      { status: 500 }
    );
  }
}
