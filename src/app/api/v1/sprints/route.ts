import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/public-api-handler";
import { sprintStatusEnum } from "@/lib/validations/sprint";

type SprintStatus = "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

// GET /api/v1/sprints - List all sprints for the authenticated team
export const GET = withApiAuth(async (request: NextRequest, { team }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Validate status filter if provided
    let statusFilter = {};
    if (status) {
      if (sprintStatusEnum.safeParse(status).success) {
        statusFilter = { status: status as SprintStatus };
      } else {
        return NextResponse.json(
          { error: `Invalid status: ${status}`, validStatuses: sprintStatusEnum.options },
          { status: 400 }
        );
      }
    }

    const sprints = await prisma.sprint.findMany({
      where: {
        teamId: team.id,
        ...statusFilter,
      },
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { releases: true },
        },
      },
    });

    return NextResponse.json(sprints);
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return NextResponse.json(
      { error: "Failed to fetch sprints" },
      { status: 500 }
    );
  }
}, { requiredScopes: ["sprints:read"] });
