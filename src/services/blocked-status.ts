import { prisma } from "@/lib/prisma";

/**
 * Recalculates the blocked status for a specific release based on its dependencies.
 * A release is blocked if it has any unresolved BLOCKS dependencies where the
 * blocking release is not yet DEPLOYED or CANCELLED.
 *
 * Manual blocks (blockedReason not starting with "Blocked by:") are preserved
 * when there are no dependency blockers.
 */
export async function recalculateBlockedStatus(releaseId: string): Promise<void> {
  // Fetch current release to check for manual block
  const currentRelease = await prisma.release.findUnique({
    where: { id: releaseId },
    select: { blockedReason: true, isBlocked: true },
  });

  const unresolvedBlockers = await prisma.releaseDependency.findFirst({
    where: {
      dependentReleaseId: releaseId,
      type: "BLOCKS",
      isResolved: false,
      blockingRelease: {
        status: {
          notIn: ["DEPLOYED", "CANCELLED"],
        },
      },
    },
    include: {
      blockingRelease: {
        select: { title: true, status: true },
      },
    },
  });

  // Check if current blockedReason is a manual block (not auto-generated)
  const isManualBlock = currentRelease?.blockedReason &&
    !currentRelease.blockedReason.startsWith("Blocked by:");

  // Don't overwrite manual blocks when there are no dependency blockers
  if (isManualBlock && !unresolvedBlockers) {
    // Manual block exists but no dependency blockers - preserve manual block
    return;
  }

  const isBlocked = !!unresolvedBlockers;
  const blockedReason = unresolvedBlockers
    ? `Blocked by: ${unresolvedBlockers.blockingRelease.title} (${unresolvedBlockers.blockingRelease.status})`
    : null;

  await prisma.release.update({
    where: { id: releaseId },
    data: {
      isBlocked,
      blockedReason,
    },
  });
}

/**
 * Recalculates blocked status for all releases that depend on a given release.
 * This should be called when a release status changes to DEPLOYED or CANCELLED.
 */
export async function recalculateDependentBlockedStatus(
  blockingReleaseId: string
): Promise<void> {
  const dependentReleases = await prisma.releaseDependency.findMany({
    where: { blockingReleaseId },
    select: { dependentReleaseId: true },
  });

  for (const dep of dependentReleases) {
    await recalculateBlockedStatus(dep.dependentReleaseId);
  }
}
