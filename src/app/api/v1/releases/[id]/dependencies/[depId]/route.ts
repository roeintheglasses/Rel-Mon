import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDependencySchema } from "@/lib/validations/dependency";
import { recalculateBlockedStatus } from "@/services/blocked-status";
import { withApiAuth } from "@/lib/public-api-handler";

// GET /api/v1/releases/[id]/dependencies/[depId] - Get a specific dependency
export const GET = withApiAuth(
  async (request: NextRequest, { team, params }) => {
    try {
      const { id: releaseId, depId } = await params;

      const dependency = await prisma.releaseDependency.findFirst({
        where: {
          id: depId,
          dependentReleaseId: releaseId,
          dependentRelease: { teamId: team.id },
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

      if (!dependency) {
        return NextResponse.json(
          { error: "Dependency not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id: dependency.id,
        type: dependency.type,
        description: dependency.description,
        isResolved: dependency.isResolved,
        resolvedAt: dependency.resolvedAt,
        createdAt: dependency.createdAt,
        release: dependency.blockingRelease,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to fetch dependency" },
        { status: 500 }
      );
    }
  },
  { requiredScopes: ["dependencies:read"] }
);

// PATCH /api/v1/releases/[id]/dependencies/[depId] - Update a dependency
export const PATCH = withApiAuth(
  async (request: NextRequest, { team, apiKey, params }) => {
    try {
      const { id: releaseId, depId } = await params;

      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      const validationResult = updateDependencySchema.safeParse(body);

      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: validationResult.error.flatten() },
          { status: 400 }
        );
      }

      const data = validationResult.data;

      const existingDependency = await prisma.releaseDependency.findFirst({
        where: {
          id: depId,
          dependentReleaseId: releaseId,
          dependentRelease: { teamId: team.id },
        },
      });

      if (!existingDependency) {
        return NextResponse.json(
          { error: "Dependency not found" },
          { status: 404 }
        );
      }

      // Prepare update data
      const updateData: {
        type?: "BLOCKS" | "SOFT_DEPENDENCY" | "REQUIRES_SYNC";
        description?: string;
        isResolved?: boolean;
        resolvedAt?: Date | null;
      } = {};

      if (data.type !== undefined) {
        updateData.type = data.type;
      }

      if (data.description !== undefined) {
        updateData.description = data.description;
      }

      if (data.isResolved !== undefined) {
        updateData.isResolved = data.isResolved;
        updateData.resolvedAt = data.isResolved ? new Date() : null;
      }

      const dependency = await prisma.releaseDependency.update({
        where: { id: depId },
        data: updateData,
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

      // Log activity if resolved status actually changed
      if (data.isResolved !== undefined && data.isResolved !== existingDependency.isResolved) {
        await prisma.activity.create({
          data: {
            teamId: team.id,
            releaseId,
            type: "DEPENDENCY_RESOLVED",
            action: data.isResolved ? "resolved" : "unresolved",
            description: data.isResolved
              ? `Resolved dependency on "${dependency.blockingRelease.title}" via API (Key: ${apiKey.name})`
              : `Unresolved dependency on "${dependency.blockingRelease.title}" via API (Key: ${apiKey.name})`,
            metadata: {
              dependencyId: dependency.id,
              blockingReleaseId: dependency.blockingReleaseId,
            },
          },
        });
      }

      return NextResponse.json({
        id: dependency.id,
        type: dependency.type,
        description: dependency.description,
        isResolved: dependency.isResolved,
        resolvedAt: dependency.resolvedAt,
        createdAt: dependency.createdAt,
        release: dependency.blockingRelease,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to update dependency" },
        { status: 500 }
      );
    }
  },
  { requiredScopes: ["dependencies:write"] }
);

// DELETE /api/v1/releases/[id]/dependencies/[depId] - Remove a dependency
export const DELETE = withApiAuth(
  async (request: NextRequest, { team, apiKey, params }) => {
    try {
      const { id: releaseId, depId } = await params;

      const dependency = await prisma.releaseDependency.findFirst({
        where: {
          id: depId,
          dependentReleaseId: releaseId,
          dependentRelease: { teamId: team.id },
        },
        include: {
          blockingRelease: {
            select: { title: true },
          },
        },
      });

      if (!dependency) {
        return NextResponse.json(
          { error: "Dependency not found" },
          { status: 404 }
        );
      }

      await prisma.releaseDependency.delete({
        where: { id: depId },
      });

      // Recalculate blocked status
      await recalculateBlockedStatus(releaseId);

      // Log activity
      await prisma.activity.create({
        data: {
          teamId: team.id,
          releaseId,
          type: "DEPENDENCY_RESOLVED",
          action: "removed",
          description: `Removed dependency on "${dependency.blockingRelease.title}" via API (Key: ${apiKey.name})`,
          metadata: {
            blockingReleaseId: dependency.blockingReleaseId,
          },
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to delete dependency" },
        { status: 500 }
      );
    }
  },
  { requiredScopes: ["dependencies:write"] }
);
