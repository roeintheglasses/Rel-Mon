import { auth } from "@clerk/nextjs/server";
import { prisma } from "./prisma";

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

export async function requireTeam() {
  const team = await getCurrentTeam();

  if (!team) {
    throw new Error("Team not found");
  }

  return team;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
