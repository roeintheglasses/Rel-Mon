import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { orgId, userId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Get current user for "my releases" count
    const currentUser = await prisma.user.findUnique({
      where: { clerkUserId: userId || "" },
    });

    // Parallelize all queries for better performance
    const [
      totalReleases,
      releasesInProgress,
      releasesReadyToDeploy,
      blockedReleases,
      deployedThisMonth,
      myReleases,
      activeSprintId,
      recentActivities,
      releasesByStatus,
      upcomingDeployments,
    ] = await Promise.all([
      // Total releases
      prisma.release.count({
        where: {
          teamId: team.id,
          status: { notIn: ["DEPLOYED", "CANCELLED", "ROLLED_BACK"] },
        },
      }),
      // In progress (in development, in review, in staging)
      prisma.release.count({
        where: {
          teamId: team.id,
          status: { in: ["IN_DEVELOPMENT", "IN_REVIEW", "IN_STAGING"] },
        },
      }),
      // Ready to deploy (ready for staging or production)
      prisma.release.count({
        where: {
          teamId: team.id,
          status: { in: ["READY_STAGING", "STAGING_VERIFIED", "READY_PRODUCTION"] },
        },
      }),
      // Blocked releases
      prisma.release.count({
        where: {
          teamId: team.id,
          isBlocked: true,
          status: { notIn: ["DEPLOYED", "CANCELLED", "ROLLED_BACK"] },
        },
      }),
      // Deployed this month
      prisma.release.count({
        where: {
          teamId: team.id,
          status: "DEPLOYED",
          prodDeployedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // My releases
      currentUser
        ? prisma.release.count({
            where: {
              teamId: team.id,
              ownerId: currentUser.id,
              status: { notIn: ["DEPLOYED", "CANCELLED", "ROLLED_BACK"] },
            },
          })
        : 0,
      // Get active sprint
      prisma.sprint.findFirst({
        where: {
          teamId: team.id,
          status: "ACTIVE",
        },
        select: { id: true, name: true },
      }),
      // Get recent activities
      prisma.activity.findMany({
        where: {
          release: {
            teamId: team.id,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
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
          release: {
            select: {
              id: true,
              title: true,
              service: {
                select: {
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
      // Get releases by status for chart
      prisma.release.groupBy({
        by: ["status"],
        where: {
          teamId: team.id,
          status: { notIn: ["DEPLOYED", "CANCELLED", "ROLLED_BACK"] },
        },
        _count: true,
      }),
      // Get releases ready for deployment with details
      prisma.release.findMany({
        where: {
          teamId: team.id,
          status: { in: ["READY_STAGING", "STAGING_VERIFIED", "READY_PRODUCTION"] },
          isBlocked: false,
        },
        orderBy: { statusChangedAt: "asc" },
        take: 5,
        include: {
          service: {
            select: {
              name: true,
              color: true,
            },
          },
          owner: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalReleases,
        releasesInProgress,
        releasesReadyToDeploy,
        blockedReleases,
        deployedThisMonth,
        myReleases,
      },
      activeSprint: activeSprintId,
      releasesByStatus: releasesByStatus.map((r) => ({
        status: r.status,
        count: r._count,
      })),
      recentActivities,
      upcomingDeployments,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
