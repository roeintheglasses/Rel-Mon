import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/public-api-handler";

// GET /api/v1/releases/[id] - Get a single release with full details
export const GET = withApiAuth(async (request: NextRequest, { team, params }) => {
  try {
    const { id } = await params;

    const release = await prisma.release.findFirst({
      where: { id, teamId: team.id },
      include: {
        service: true,
        sprint: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        items: {
          orderBy: { createdAt: "desc" },
        },
        dependsOn: {
          include: {
            blockingRelease: {
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
          },
        },
        dependents: {
          include: {
            dependentRelease: {
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
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
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
        },
        comments: {
          orderBy: { createdAt: "desc" },
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
        },
      },
    });

    if (!release) {
      return NextResponse.json(
        { error: "Release not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(release);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch release" },
      { status: 500 }
    );
  }
});
