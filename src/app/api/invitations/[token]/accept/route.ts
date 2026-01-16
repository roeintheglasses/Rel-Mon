import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST - Accept an invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { userId } = await auth();
    const { token } = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user
    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            clerkOrgId: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: "This invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if email matches (case-insensitive)
    if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: "This invitation was sent to a different email address",
          invitedEmail: invitation.email,
          yourEmail: currentUser.email,
        },
        { status: 403 }
      );
    }

    // Use upsert to handle race conditions - if membership already exists,
    // this is idempotent and won't fail on concurrent requests
    const [membership] = await prisma.$transaction([
      prisma.teamMember.upsert({
        where: {
          teamId_userId: {
            teamId: invitation.teamId,
            userId: currentUser.id,
          },
        },
        create: {
          teamId: invitation.teamId,
          userId: currentUser.id,
          role: invitation.role,
        },
        update: {
          // Keep existing membership unchanged if already a member
        },
      }),
      prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    // Check if this was an existing membership (role might differ from invitation)
    const wasAlreadyMember = membership.joinedAt < new Date(Date.now() - 1000);

    return NextResponse.json({
      success: true,
      alreadyMember: wasAlreadyMember,
      team: invitation.team,
      role: membership.role,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
