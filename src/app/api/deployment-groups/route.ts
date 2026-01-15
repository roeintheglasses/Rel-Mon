import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createDeploymentGroupSchema } from "@/lib/validations/deployment-group";

// GET /api/deployment-groups - List all deployment groups for the current team
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get("sprintId");
    const status = searchParams.get("status");

    const deploymentGroups = await prisma.deploymentGroup.findMany({
      where: {
        teamId: team.id,
        ...(sprintId ? { sprintId } : {}),
        ...(status ? { status: status as "PENDING" | "READY" | "DEPLOYING" | "DEPLOYED" | "CANCELLED" } : {}),
      },
      orderBy: { updatedAt: "desc" },
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
          select: {
            id: true,
            title: true,
            status: true,
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

    return NextResponse.json(deploymentGroups);
  } catch (error) {
    console.error("Error fetching deployment groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch deployment groups" },
      { status: 500 }
    );
  }
}

// POST /api/deployment-groups - Create a new deployment group
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    const user = await currentUser();

    if (!orgId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Get or create user record
    let dbUser = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          clerkUserId: user.id,
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          avatarUrl: user.imageUrl || null,
        },
      });
    }

    const body = await request.json();
    const validatedData = createDeploymentGroupSchema.parse(body);

    // Verify sprint belongs to team if provided
    if (validatedData.sprintId) {
      const sprint = await prisma.sprint.findFirst({
        where: { id: validatedData.sprintId, teamId: team.id },
      });

      if (!sprint) {
        return NextResponse.json(
          { error: "Sprint not found" },
          { status: 404 }
        );
      }
    }

    const deploymentGroup = await prisma.deploymentGroup.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        deployOrder: validatedData.deployOrder || "SEQUENTIAL",
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
        notifyOnReady: validatedData.notifyOnReady ?? true,
        teamId: team.id,
        sprintId: validatedData.sprintId || null,
        ownerId: dbUser.id,
        status: "PENDING",
      },
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
        _count: {
          select: { releases: true },
        },
      },
    });

    return NextResponse.json(deploymentGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating deployment group:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create deployment group" },
      { status: 500 }
    );
  }
}
