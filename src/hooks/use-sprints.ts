"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateSprintInput, UpdateSprintInput } from "@/lib/validations/sprint";

export interface Sprint {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  goal: string | null;
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
  _count?: {
    releases: number;
  };
}

interface FetchSprintsOptions {
  status?: string;
}

async function fetchSprints(options?: FetchSprintsOptions): Promise<Sprint[]> {
  const params = new URLSearchParams();
  if (options?.status) {
    params.set("status", options.status);
  }
  const url = `/api/sprints${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch sprints");
  }
  return response.json();
}

async function fetchSprint(id: string): Promise<Sprint> {
  const response = await fetch(`/api/sprints/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch sprint");
  }
  return response.json();
}

async function createSprint(data: CreateSprintInput): Promise<Sprint> {
  const response = await fetch("/api/sprints", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create sprint");
  }
  return response.json();
}

async function updateSprint({
  id,
  data,
}: {
  id: string;
  data: UpdateSprintInput;
}): Promise<Sprint> {
  const response = await fetch(`/api/sprints/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update sprint");
  }
  return response.json();
}

async function deleteSprint(id: string): Promise<void> {
  const response = await fetch(`/api/sprints/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete sprint");
  }
}

export function useSprints(options?: FetchSprintsOptions) {
  return useQuery({
    queryKey: ["sprints", options],
    queryFn: () => fetchSprints(options),
  });
}

export function useSprint(id: string) {
  return useQuery({
    queryKey: ["sprints", id],
    queryFn: () => fetchSprint(id),
    enabled: !!id,
  });
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSprint,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["sprints", data.id] });
    },
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSprint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
    },
  });
}
