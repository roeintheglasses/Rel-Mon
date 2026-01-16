import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/public-api-handler";

// GET /api/v1/sprints/[id] - Get a single sprint
export const GET = withApiAuth(
  async (
    request: NextRequest,
    { team, params }: { team: any; params?: Promise<{ id: string }> }
  ) => {
    try {
      const { id } = await params!;

      const sprint = await prisma.sprint.findFirst({
        where: { id, teamId: team.id },
        include: {
          _count: {
            select: { releases: true },
          },
          releases: {
            include: {
              service: true,
              owner: true,
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      });

      if (!sprint) {
        return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
      }

      return NextResponse.json(sprint);
    } catch (error) {
      console.error("Error fetching sprint:", error);
      return NextResponse.json(
        { error: "Failed to fetch sprint" },
        { status: 500 }
      );
    }
  },
  { requiredScopes: ["sprints:read"] }
);
