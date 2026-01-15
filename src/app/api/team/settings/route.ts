import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSettingsSchema = z.object({
  slackWebhookUrl: z.string().url().nullable().optional(),
  slackChannel: z.string().max(100).nullable().optional(),
  notifyOnStatusChange: z.boolean().optional(),
  notifyOnBlocked: z.boolean().optional(),
  notifyOnReadyToDeploy: z.boolean().optional(),
});

// GET - Get team settings
export async function GET() {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        slackWebhookUrl: true,
        slackChannel: true,
        notifyOnStatusChange: true,
        notifyOnBlocked: true,
        notifyOnReadyToDeploy: true,
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Mask webhook URL for security (only show last 8 chars)
    const maskedTeam = {
      ...team,
      slackWebhookUrl: team.slackWebhookUrl
        ? `****${team.slackWebhookUrl.slice(-8)}`
        : null,
      hasSlackWebhook: !!team.slackWebhookUrl,
    };

    return NextResponse.json(maskedTeam);
  } catch (error) {
    console.error("Error fetching team settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH - Update team settings
export async function PATCH(request: NextRequest) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
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

    const validationResult = updateSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Update team settings
    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: {
        ...(data.slackWebhookUrl !== undefined && {
          slackWebhookUrl: data.slackWebhookUrl,
        }),
        ...(data.slackChannel !== undefined && {
          slackChannel: data.slackChannel,
        }),
        ...(data.notifyOnStatusChange !== undefined && {
          notifyOnStatusChange: data.notifyOnStatusChange,
        }),
        ...(data.notifyOnBlocked !== undefined && {
          notifyOnBlocked: data.notifyOnBlocked,
        }),
        ...(data.notifyOnReadyToDeploy !== undefined && {
          notifyOnReadyToDeploy: data.notifyOnReadyToDeploy,
        }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        slackWebhookUrl: true,
        slackChannel: true,
        notifyOnStatusChange: true,
        notifyOnBlocked: true,
        notifyOnReadyToDeploy: true,
      },
    });

    // Mask webhook URL for security
    const maskedTeam = {
      ...updatedTeam,
      slackWebhookUrl: updatedTeam.slackWebhookUrl
        ? `****${updatedTeam.slackWebhookUrl.slice(-8)}`
        : null,
      hasSlackWebhook: !!updatedTeam.slackWebhookUrl,
    };

    return NextResponse.json(maskedTeam);
  } catch (error) {
    console.error("Error updating team settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
