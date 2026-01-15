import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { assignReleasesSchema } from "@/lib/validations/deployment-group";
import { ZodError } from "zod";

// POST /api/deployment-groups/[id]/releases - Assign releases to a deployment group
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    const { id } = await params;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if deployment group exists and belongs to team
    const deploymentGroup = await prisma.deploymentGroup.findFirst({
      where: { id, teamId: team.id },
    });

    if (!deploymentGroup) {
      return NextResponse.json({ error: "Deployment group not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = assignReleasesSchema.parse(body);

    // Verify all releases belong to team
    const releases = await prisma.release.findMany({
      where: {
        id: { in: validatedData.releaseIds },
        teamId: team.id,
      },
    });

    if (releases.length !== validatedData.releaseIds.length) {
      return NextResponse.json(
        { error: "One or more releases not found" },
        { status: 404 }
      );
    }

    // Assign releases to the deployment group
    await prisma.release.updateMany({
      where: {
        id: { in: validatedData.releaseIds },
        teamId: team.id,
      },
      data: { deploymentGroupId: id },
    });

    // Fetch the updated deployment group with releases
    const updatedGroup = await prisma.deploymentGroup.findFirst({
      where: { id, teamId: team.id },
      include: {
        sprint: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        releases: {
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
        _count: {
          select: { releases: true },
        },
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error assigning releases:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to assign releases" },
      { status: 500 }
    );
  }
}

// DELETE /api/deployment-groups/[id]/releases - Remove releases from a deployment group
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    const { id } = await params;

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if deployment group exists and belongs to team
    const deploymentGroup = await prisma.deploymentGroup.findFirst({
      where: { id, teamId: team.id },
    });

    if (!deploymentGroup) {
      return NextResponse.json({ error: "Deployment group not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = assignReleasesSchema.parse(body);

    // Remove releases from the deployment group
    await prisma.release.updateMany({
      where: {
        id: { in: validatedData.releaseIds },
        teamId: team.id,
        deploymentGroupId: id,
      },
      data: { deploymentGroupId: null },
    });

    // Fetch the updated deployment group
    const updatedGroup = await prisma.deploymentGroup.findFirst({
      where: { id, teamId: team.id },
      include: {
        sprint: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        releases: {
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
        _count: {
          select: { releases: true },
        },
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    console.error("Error removing releases:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to remove releases" },
      { status: 500 }
    );
  }
}
