import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseStatusEnum, ReleaseStatus } from "@/lib/validations/release";
import { withApiAuth } from "@/lib/public-api-handler";

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
});
