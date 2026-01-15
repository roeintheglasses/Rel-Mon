"use client";

import { useQuery } from "@tanstack/react-query";

export interface ActivityUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface Activity {
  id: string;
  teamId: string | null;
  releaseId: string | null;
  userId: string | null;
  type: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: ActivityUser | null;
}

async function fetchActivities(releaseId: string, limit?: number): Promise<Activity[]> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", limit.toString());

  const url = `/api/releases/${releaseId}/activities${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch activities");
  }
  return response.json();
}

export function useActivities(releaseId: string, limit?: number) {
  return useQuery({
    queryKey: ["activities", releaseId, limit],
    queryFn: () => fetchActivities(releaseId, limit),
    enabled: !!releaseId,
  });
}
