"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateDeploymentGroupInput,
  UpdateDeploymentGroupInput,
  DeployOrder,
  DeploymentGroupStatus,
} from "@/lib/validations/deployment-group";

export interface DeploymentGroupOwner {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface DeploymentGroupSprint {
  id: string;
  name: string;
  status: string;
}

export interface DeploymentGroupRelease {
  id: string;
  title: string;
  status: string;
  service: {
    id: string;
    name: string;
    color: string;
  };
  owner?: DeploymentGroupOwner;
}

export interface DeploymentGroup {
  id: string;
  teamId: string;
  sprintId: string | null;
  ownerId: string | null;
  name: string;
  description: string | null;
  deployOrder: DeployOrder;
  orderSequence: string[];
  targetDate: string | null;
  deployedAt: string | null;
  status: DeploymentGroupStatus;
  notifyOnReady: boolean;
  createdAt: string;
  updatedAt: string;
  sprint: DeploymentGroupSprint | null;
  owner: DeploymentGroupOwner | null;
  releases?: DeploymentGroupRelease[];
  _count?: {
    releases: number;
  };
}

interface FetchDeploymentGroupsOptions {
  sprintId?: string;
  status?: string;
}

async function fetchDeploymentGroups(options?: FetchDeploymentGroupsOptions): Promise<DeploymentGroup[]> {
  const params = new URLSearchParams();
  if (options?.sprintId) params.set("sprintId", options.sprintId);
  if (options?.status) params.set("status", options.status);

  const url = `/api/deployment-groups${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch deployment groups");
  }
  return response.json();
}

async function fetchDeploymentGroup(id: string): Promise<DeploymentGroup> {
  const response = await fetch(`/api/deployment-groups/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch deployment group");
  }
  return response.json();
}

async function createDeploymentGroup(data: CreateDeploymentGroupInput): Promise<DeploymentGroup> {
  const response = await fetch("/api/deployment-groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create deployment group");
  }
  return response.json();
}

async function updateDeploymentGroup({
  id,
  data,
}: {
  id: string;
  data: UpdateDeploymentGroupInput;
}): Promise<DeploymentGroup> {
  const response = await fetch(`/api/deployment-groups/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update deployment group");
  }
  return response.json();
}

async function deleteDeploymentGroup(id: string): Promise<void> {
  const response = await fetch(`/api/deployment-groups/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete deployment group");
  }
}

async function assignReleases({
  groupId,
  releaseIds,
}: {
  groupId: string;
  releaseIds: string[];
}): Promise<DeploymentGroup> {
  const response = await fetch(`/api/deployment-groups/${groupId}/releases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ releaseIds }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to assign releases");
  }
  return response.json();
}

async function removeReleases({
  groupId,
  releaseIds,
}: {
  groupId: string;
  releaseIds: string[];
}): Promise<DeploymentGroup> {
  const response = await fetch(`/api/deployment-groups/${groupId}/releases`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ releaseIds }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove releases");
  }
  return response.json();
}

export function useDeploymentGroups(options?: FetchDeploymentGroupsOptions) {
  return useQuery({
    queryKey: ["deployment-groups", options],
    queryFn: () => fetchDeploymentGroups(options),
  });
}

export function useDeploymentGroup(id: string) {
  return useQuery({
    queryKey: ["deployment-groups", id],
    queryFn: () => fetchDeploymentGroup(id),
    enabled: !!id,
  });
}

export function useCreateDeploymentGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDeploymentGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployment-groups"] });
    },
  });
}

export function useUpdateDeploymentGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDeploymentGroup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deployment-groups"] });
      queryClient.invalidateQueries({ queryKey: ["deployment-groups", data.id] });
    },
  });
}

export function useDeleteDeploymentGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDeploymentGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deployment-groups"] });
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
  });
}

export function useAssignReleases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignReleases,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deployment-groups"] });
      queryClient.invalidateQueries({ queryKey: ["deployment-groups", data.id] });
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
  });
}

export function useRemoveReleases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeReleases,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["deployment-groups"] });
      queryClient.invalidateQueries({ queryKey: ["deployment-groups", data.id] });
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
  });
}
