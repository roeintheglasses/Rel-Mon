import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/public-api-handler";

// GET /api/v1/sprints - List all sprints for the authenticated team
export const GET = withApiAuth(async (request: NextRequest, { team }) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const sprints = await prisma.sprint.findMany({
      where: {
        teamId: team.id,
        ...(status ? { status: status as "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED" } : {}),
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
