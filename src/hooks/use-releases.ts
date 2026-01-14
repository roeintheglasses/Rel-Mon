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

export interface Release {
  id: string;
  teamId: string;
  serviceId: string;
  sprintId: string | null;
  ownerId: string;
  title: string;
  description: string | null;
  version: string | null;
  status: ReleaseStatus;
  targetDate: string | null;
  deployedAt: string | null;
  createdAt: string;
  updatedAt: string;
  service: ReleaseService;
  sprint: ReleaseSprint | null;
  owner: ReleaseOwner;
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
  ownerId?: string;
}

async function fetchReleases(options?: FetchReleasesOptions): Promise<Release[]> {
  const params = new URLSearchParams();
  if (options?.sprintId) params.set("sprintId", options.sprintId);
  if (options?.serviceId) params.set("serviceId", options.serviceId);
  if (options?.status) params.set("status", options.status);
  if (options?.ownerId) params.set("ownerId", options.ownerId);

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
