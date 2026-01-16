import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

/**
 * Gets the current authenticated user from Clerk
 * @returns The user object if authenticated, null otherwise
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
  });

  return user;
}

/**
 * Gets the current team (organization) from Clerk
 * @returns The team object if user is in an organization, null otherwise
 */
export async function getCurrentTeam() {
  const { orgId } = await auth();

  if (!orgId) {
    return null;
  }

  const team = await prisma.team.findUnique({
    where: { clerkOrgId: orgId },
  });

  return team;
}

/**
 * Requires a team context, throwing an error if not found
 * @returns The team object
 * @throws Error if team is not found
 */
export async function requireTeam() {
  const team = await getCurrentTeam();

  if (!team) {
    throw new Error("Team not found");
  }

  return team;
}

/**
 * Requires user authentication, throwing an error if not authenticated
 * @returns The user object
 * @throws Error if user is not authenticated
 */
export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
