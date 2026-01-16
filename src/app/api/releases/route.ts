import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createReleaseSchema, ReleaseStatus, releaseStatusEnum } from "@/lib/validations/release";

/**
 * GET /api/releases - List all releases for the current team
 * @description Fetches releases with optional filters (sprint, service, status, owner, blocked)
 * @param request - HTTP request with optional query parameters
 * @returns JSON array of releases with service, sprint, owner, and count details
 */
export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!orgId || !userId) {
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
    const serviceId = searchParams.get("serviceId");
    const status = searchParams.get("status");
    const statuses = searchParams.get("statuses"); // comma-separated statuses
    const ownerId = searchParams.get("ownerId");
    const mine = searchParams.get("mine") === "true";
    const isBlocked = searchParams.get("isBlocked");

    // If filtering by "mine", get the current user's DB id
    let currentUserDbId: string | undefined;
    if (mine) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkUserId: userId },
        select: { id: true },
      });
      currentUserDbId = dbUser?.id;
      if (!currentUserDbId) {
        // User not found in DB, return empty array
        return NextResponse.json([]);
      }
    }

    // Build status filter with validation
    let statusFilter = {};
    if (statuses) {
      const statusList = statuses
        .split(",")
        .filter((s) => releaseStatusEnum.safeParse(s).success) as ReleaseStatus[];
      if (statusList.length > 0) {
        statusFilter = { status: { in: statusList } };
      }
    } else if (status) {
      if (releaseStatusEnum.safeParse(status).success) {
        statusFilter = { status: status as ReleaseStatus };
      }
    }

    const releases = await prisma.release.findMany({
      where: {
        teamId: team.id,
        ...(sprintId ? { sprintId } : {}),
        ...(serviceId ? { serviceId } : {}),
        ...statusFilter,
        ...(ownerId ? { ownerId } : {}),
        ...(mine && currentUserDbId ? { ownerId: currentUserDbId } : {}),
        ...(isBlocked === "true" ? { isBlocked: true } : {}),
        ...(isBlocked === "false" ? { isBlocked: false } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
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
          select: {
            items: true,
            dependsOn: true,
            dependents: true,
          },
        },
      },
    });

    return NextResponse.json(releases);
  } catch (error) {
    console.error("Error fetching releases:", error);
    return NextResponse.json(
      { error: "Failed to fetch releases" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/releases - Create a new release
 * @description Creates a new release for the team with validation
 * @param request - HTTP request with release data in body
 * @returns JSON of created release with service, sprint, and owner details
 */
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
    const validatedData = createReleaseSchema.parse(body);

    // Verify service belongs to team
    const service = await prisma.service.findFirst({
      where: { id: validatedData.serviceId, teamId: team.id },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

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

    const release = await prisma.release.create({
      data: {
        title: validatedData.title,
        description: validatedData.description || null,
        version: validatedData.version || null,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null,
        teamId: team.id,
        serviceId: validatedData.serviceId,
        sprintId: validatedData.sprintId || null,
        ownerId: dbUser.id,
        status: "PLANNING",
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
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
      },
    });

    return NextResponse.json(release, { status: 201 });
  } catch (error) {
    console.error("Error creating release:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create release" },
      { status: 500 }
    );
  }
}
