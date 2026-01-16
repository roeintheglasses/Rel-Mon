import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDependencySchema } from "@/lib/validations/dependency";
import { recalculateBlockedStatus } from "@/services/blocked-status";
import { withApiAuth } from "@/lib/public-api-handler";

// GET /api/v1/releases/[id]/dependencies - List dependencies for a release
export const GET = withApiAuth(
  async (request: NextRequest, { team, params }) => {
    try {
      const { id: releaseId } = await params;

      // Verify the release belongs to the team
      const release = await prisma.release.findFirst({
        where: { id: releaseId, teamId: team.id },
      });

      if (!release) {
        return NextResponse.json(
          { error: "Release not found" },
          { status: 404 }
        );
      }

      // Get dependencies (releases this release depends on)
      const dependsOn = await prisma.releaseDependency.findMany({
        where: { dependentReleaseId: releaseId },
        include: {
          blockingRelease: {
            select: {
              id: true,
              title: true,
              version: true,
              status: true,
              service: {
                select: { name: true, color: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Get dependents (releases that depend on this release)
      const dependents = await prisma.releaseDependency.findMany({
        where: { blockingReleaseId: releaseId },
        include: {
          dependentRelease: {
            select: {
              id: true,
              title: true,
              version: true,
              status: true,
              service: {
                select: { name: true, color: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        dependsOn: dependsOn.map((d) => ({
          id: d.id,
          type: d.type,
          description: d.description,
          isResolved: d.isResolved,
          resolvedAt: d.resolvedAt,
          createdAt: d.createdAt,
          release: d.blockingRelease,
        })),
        dependents: dependents.map((d) => ({
          id: d.id,
          type: d.type,
          description: d.description,
          isResolved: d.isResolved,
          resolvedAt: d.resolvedAt,
          createdAt: d.createdAt,
          release: d.dependentRelease,
        })),
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to fetch dependencies" },
        { status: 500 }
      );
    }
  }
);

// POST /api/v1/releases/[id]/dependencies - Add a dependency
export const POST = withApiAuth(
  async (request: NextRequest, { team, apiKey, params }) => {
    try {
      const { id: releaseId } = await params;

      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const validationResult = createDependencySchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.flatten() },
          { status: 400 }
        );
      }

      const { blockingReleaseId, type, description } = validationResult.data;

      // Verify both releases exist and belong to the team
      const [dependentRelease, blockingRelease] = await Promise.all([
        prisma.release.findFirst({
          where: { id: releaseId, teamId: team.id },
        }),
        prisma.release.findFirst({
          where: { id: blockingReleaseId, teamId: team.id },
        }),
      ]);

      if (!dependentRelease) {
        return NextResponse.json(
          { error: "Release not found" },
          { status: 404 }
        );
      }

      if (!blockingRelease) {
        return NextResponse.json(
          { error: "Blocking release not found" },
          { status: 404 }
        );
      }

      // Prevent self-dependency
      if (releaseId === blockingReleaseId) {
        return NextResponse.json(
          { error: "A release cannot depend on itself" },
          { status: 400 }
        );
      }

      // Check for circular dependency
      const wouldCreateCycle = await checkCircularDependency(
        blockingReleaseId,
        releaseId
      );

      if (wouldCreateCycle) {
        return NextResponse.json(
          { error: "This would create a circular dependency" },
          { status: 400 }
        );
      }

      // Check if dependency already exists
      const existingDependency = await prisma.releaseDependency.findUnique({
        where: {
          dependentReleaseId_blockingReleaseId: {
            dependentReleaseId: releaseId,
            blockingReleaseId,
          },
        },
      });

      if (existingDependency) {
        return NextResponse.json(
          { error: "Dependency already exists" },
          { status: 409 }
        );
      }

      // Create the dependency
      const dependency = await prisma.releaseDependency.create({
        data: {
          dependentReleaseId: releaseId,
          blockingReleaseId,
          type: type || "BLOCKS",
          description,
        },
        include: {
          blockingRelease: {
            select: {
              id: true,
              title: true,
              version: true,
              status: true,
              service: {
                select: { name: true, color: true },
              },
            },
          },
        },
      });

      // Recalculate blocked status
      await recalculateBlockedStatus(releaseId);

      // Log activity
      await prisma.activity.create({
        data: {
          teamId: team.id,
          releaseId,
          type: "DEPENDENCY_ADDED",
          action: "added",
          description: `Added dependency on "${blockingRelease.title}" via API (Key: ${apiKey.name})`,
          metadata: {
            dependencyId: dependency.id,
            blockingReleaseId,
            type: dependency.type,
          },
        },
      });

      return NextResponse.json(
        {
          id: dependency.id,
          type: dependency.type,
          description: dependency.description,
          isResolved: dependency.isResolved,
          createdAt: dependency.createdAt,
          release: dependency.blockingRelease,
        },
        { status: 201 }
      );
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to create dependency" },
        { status: 500 }
      );
    }
  }
);

// Helper to check for circular dependencies
async function checkCircularDependency(
  startId: string,
  targetId: string,
  visited: Set<string> = new Set()
): Promise<boolean> {
  if (startId === targetId) {
    return true;
  }

  if (visited.has(startId)) {
    return false;
  }

  visited.add(startId);

  // Get all releases that the startId depends on
  const dependencies = await prisma.releaseDependency.findMany({
    where: { dependentReleaseId: startId },
    select: { blockingReleaseId: true },
  });

  for (const dep of dependencies) {
    if (
      await checkCircularDependency(dep.blockingReleaseId, targetId, visited)
    ) {
      return true;
    }
  }

  return false;
}
