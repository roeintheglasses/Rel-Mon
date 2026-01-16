import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseStatusEnum, ReleaseStatus, createReleaseSchema } from "@/lib/validations/release";
import { withApiAuth } from "@/lib/public-api-handler";

// Pagination defaults
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// GET /api/v1/releases - List all releases for the authenticated team
export const GET = withApiAuth(async (request: NextRequest, { team }) => {
  try {
    const { searchParams } = new URL(request.url);
    const sprintId = searchParams.get("sprintId");
    const serviceId = searchParams.get("serviceId");
    const status = searchParams.get("status");
    const statuses = searchParams.get("statuses"); // comma-separated statuses
    const ownerId = searchParams.get("ownerId");
    const isBlocked = searchParams.get("isBlocked");

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10));
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)));
    const skip = (page - 1) * limit;

    // Build status filter with validation
    let statusFilter = {};
    if (statuses) {
      const statusList = statuses
        .split(",")
        .filter((s) => releaseStatusEnum.safeParse(s).success) as ReleaseStatus[];
      if (statusList.length > 0) {
        statusFilter = { status: { in: statusList } };
      } else {
        // All provided statuses were invalid
        return NextResponse.json(
          { error: "Invalid status values provided", validStatuses: releaseStatusEnum.options },
          { status: 400 }
        );
      }
    } else if (status) {
      if (releaseStatusEnum.safeParse(status).success) {
        statusFilter = { status: status as ReleaseStatus };
      } else {
        return NextResponse.json(
          { error: `Invalid status: ${status}`, validStatuses: releaseStatusEnum.options },
          { status: 400 }
        );
      }
    }

    // Build where clause
    const whereClause = {
      teamId: team.id,
      ...(sprintId ? { sprintId } : {}),
      ...(serviceId ? { serviceId } : {}),
      ...statusFilter,
      ...(ownerId ? { ownerId } : {}),
      ...(isBlocked === "true" ? { isBlocked: true } : {}),
      ...(isBlocked === "false" ? { isBlocked: false } : {}),
    };

    // Get total count for pagination metadata
    const totalCount = await prisma.release.count({ where: whereClause });

    const releases = await prisma.release.findMany({
      where: whereClause,
      skip,
      take: limit,
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

    // Return paginated response with metadata
    const totalPages = Math.ceil(totalCount / limit);
    return NextResponse.json({
      data: releases,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching releases:", error);
    return NextResponse.json(
      { error: "Failed to fetch releases" },
      { status: 500 }
    );
  }
}, { requiredScopes: ["releases:read"] });

// POST /api/v1/releases - Create a new release
export const POST = withApiAuth(async (request: NextRequest, { team }) => {
  try {
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

    // Handle optional ownerId from request body
    let ownerId: string | null = null;
    if (body.ownerId) {
      // Verify owner exists and belongs to team
      const owner = await prisma.user.findFirst({
        where: {
          id: body.ownerId,
          memberships: {
            some: {
              teamId: team.id,
            },
          },
        },
      });

      if (!owner) {
        return NextResponse.json(
          { error: "Owner not found or does not belong to team" },
          { status: 404 }
        );
      }

      ownerId = body.ownerId;
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
        ownerId,
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
        _count: {
          select: {
            items: true,
            dependsOn: true,
            dependents: true,
          },
        },
      },
    });

    return NextResponse.json(release, { status: 201 });
  } catch (error) {
    console.error("Error creating release:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create release" },
      { status: 500 }
    );
  }
}, { requiredScopes: ["releases:write"] });
