import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(10000),
});

// PATCH - Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id: releaseId, commentId } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const validationResult = updateCommentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { content } = validationResult.data;

    // Verify the release belongs to the team
    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const release = await prisma.release.findFirst({
      where: { id: releaseId, teamId: team.id },
    });

    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the comment
    const existingComment = await prisma.comment.findFirst({
      where: { id: commentId, releaseId },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the author can edit their comment
    if (existingComment.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    // Update the comment
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
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

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    const { id: releaseId, commentId } = await params;

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the release belongs to the team
    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const release = await prisma.release.findFirst({
      where: { id: releaseId, teamId: team.id },
    });

    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the comment
    const existingComment = await prisma.comment.findFirst({
      where: { id: commentId, releaseId },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only the author can delete their comment
    // (Admins could also delete, but we'll keep it simple for now)
    if (existingComment.userId !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    // Delete the comment
    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
