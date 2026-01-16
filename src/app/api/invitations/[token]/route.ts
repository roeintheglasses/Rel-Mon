import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Mask an email address for privacy (e.g., "john.doe@example.com" -> "j***@example.com")
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  const maskedLocal = localPart.length > 1
    ? `${localPart[0]}${"*".repeat(Math.min(localPart.length - 1, 5))}`
    : localPart;
  return `${maskedLocal}@${domain}`;
}

// GET - Get invitation details (public endpoint for invite page)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
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
        { error: "This invitation has already been accepted", status: "accepted" },
        { status: 400 }
      );
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired", status: "expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: invitation.id,
      email: maskEmail(invitation.email),
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      team: invitation.team,
    });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}
