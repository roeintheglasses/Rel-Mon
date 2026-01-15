"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateReleaseInput, UpdateReleaseInput, ReleaseStatus } from "@/lib/validations/release";

export interface ReleaseOwner {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface ReleaseService {
  id: string;
  name: string;
  color: string;
}

export interface ReleaseSprint {
  id: string;
  name: string;
  status: string;
}

export interface ReleaseItem {
  id: string;
  releaseId: string;
  type: "JIRA_TICKET" | "GITHUB_PR";
  externalId: string;
  externalUrl: string | null;
  title: string | null;
  status: string | null;
  assignee: string | null;
  lastSyncedAt: string | null;
  syncError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseDependency {
  id: string;
  dependentReleaseId: string;
  blockingReleaseId: string;
  type: "BLOCKS" | "SOFT_DEPENDENCY" | "REQUIRES_SYNC";
  description: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  blockingRelease?: Release;
  dependentRelease?: Release;
}

export interface ReleaseActivity {
  id: string;
  teamId: string | null;
  releaseId: string | null;
  userId: string | null;
  type: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: ReleaseOwner | null;
}

export interface ReleaseComment {
  id: string;
  releaseId: string;
  userId: string;
  content: string;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: ReleaseOwner;
}

export interface Release {
  id: string;
  teamId: string;
  serviceId: string;
  sprintId: string | null;
  deploymentGroupId: string | null;
  ownerId: string;
  title: string;
  description: string | null;
  version: string | null;
  status: ReleaseStatus;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  isHotfix: boolean;
  isBlocked: boolean;
  blockedReason: string | null;
  targetDate: string | null;
  stagingDeployedAt: string | null;
  prodDeployedAt: string | null;
  createdAt: string;
  updatedAt: string;
  service: ReleaseService;
  sprint: ReleaseSprint | null;
  owner: ReleaseOwner;
  items?: ReleaseItem[];
  dependsOn?: { blockingRelease: Release }[];
  dependents?: { dependentRelease: Release }[];
  activities?: ReleaseActivity[];
  comments?: ReleaseComment[];
  _count?: {
    items: number;
    dependsOn: number;
    dependents: number;
  };
}

interface FetchReleasesOptions {
  sprintId?: string;
  serviceId?: string;
  status?: string;
  statuses?: string[];
  ownerId?: string;
  mine?: boolean;
  isBlocked?: boolean;
}

async function fetchReleases(options?: FetchReleasesOptions): Promise<Release[]> {
  const params = new URLSearchParams();
  if (options?.sprintId) params.set("sprintId", options.sprintId);
  if (options?.serviceId) params.set("serviceId", options.serviceId);
  if (options?.status) params.set("status", options.status);
  if (options?.statuses) params.set("statuses", options.statuses.join(","));
  if (options?.ownerId) params.set("ownerId", options.ownerId);
  if (options?.mine) params.set("mine", "true");
  if (options?.isBlocked !== undefined) params.set("isBlocked", String(options.isBlocked));

  const url = `/api/releases${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch releases");
  }
  return response.json();
}

async function fetchRelease(id: string): Promise<Release> {
  const response = await fetch(`/api/releases/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch release");
  }
  return response.json();
}

async function createRelease(data: CreateReleaseInput): Promise<Release> {
  const response = await fetch("/api/releases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create release");
  }
  return response.json();
}

async function updateRelease({
  id,
  data,
}: {
  id: string;
  data: UpdateReleaseInput;
}): Promise<Release> {
  const response = await fetch(`/api/releases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update release");
  }
  return response.json();
}

async function deleteRelease(id: string): Promise<void> {
  const response = await fetch(`/api/releases/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete release");
  }
}

export function useReleases(options?: FetchReleasesOptions) {
  return useQuery({
    queryKey: ["releases", options],
    queryFn: () => fetchReleases(options),
  });
}

export function useRelease(id: string) {
  return useQuery({
    queryKey: ["releases", id],
    queryFn: () => fetchRelease(id),
    enabled: !!id,
  });
}

export function useCreateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createRelease,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useUpdateRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateRelease,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["releases", data.id] });
    },
  });
}

export function useDeleteRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteRelease,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releases"] });
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}
