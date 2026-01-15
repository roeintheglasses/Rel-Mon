"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateDependencyInput,
  UpdateDependencyInput,
} from "@/lib/validations/dependency";

export interface DependencyRelease {
  id: string;
  title: string;
  version: string | null;
  status: string;
  service: {
    name: string;
    color: string;
  };
}

export interface Dependency {
  id: string;
  type: "BLOCKS" | "SOFT_DEPENDENCY" | "REQUIRES_SYNC";
  description: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
  release: DependencyRelease;
}

export interface ReleaseDependencies {
  dependsOn: Dependency[];
  dependents: Dependency[];
}

async function fetchDependencies(releaseId: string): Promise<ReleaseDependencies> {
  const response = await fetch(`/api/releases/${releaseId}/dependencies`);
  if (!response.ok) {
    throw new Error("Failed to fetch dependencies");
  }
  return response.json();
}

async function createDependency({
  releaseId,
  data,
}: {
  releaseId: string;
  data: CreateDependencyInput;
}): Promise<Dependency> {
  const response = await fetch(`/api/releases/${releaseId}/dependencies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create dependency");
  }
  return response.json();
}

async function updateDependency({
  releaseId,
  dependencyId,
  data,
}: {
  releaseId: string;
  dependencyId: string;
  data: UpdateDependencyInput;
}): Promise<Dependency> {
  const response = await fetch(
    `/api/releases/${releaseId}/dependencies/${dependencyId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update dependency");
  }
  return response.json();
}

async function deleteDependency({
  releaseId,
  dependencyId,
}: {
  releaseId: string;
  dependencyId: string;
}): Promise<void> {
  const response = await fetch(
    `/api/releases/${releaseId}/dependencies/${dependencyId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete dependency");
  }
}

export function useDependencies(releaseId: string) {
  return useQuery({
    queryKey: ["dependencies", releaseId],
    queryFn: () => fetchDependencies(releaseId),
    enabled: !!releaseId,
  });
}

export function useCreateDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDependency,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["dependencies", variables.releaseId],
      });
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
  });
}

export function useUpdateDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDependency,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["dependencies", variables.releaseId],
      });
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
  });
}

export function useDeleteDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDependency,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["dependencies", variables.releaseId],
      });
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
  });
}

export function useResolveDependency() {
  const updateDependency = useUpdateDependency();

  return {
    ...updateDependency,
    mutate: (
      {
        releaseId,
        dependencyId,
        isResolved,
      }: {
        releaseId: string;
        dependencyId: string;
        isResolved: boolean;
      },
      options?: Parameters<typeof updateDependency.mutate>[1]
    ) => {
      updateDependency.mutate(
        { releaseId, dependencyId, data: { isResolved } },
        options
      );
    },
    mutateAsync: ({
      releaseId,
      dependencyId,
      isResolved,
    }: {
      releaseId: string;
      dependencyId: string;
      isResolved: boolean;
    }) => {
      return updateDependency.mutateAsync({
        releaseId,
        dependencyId,
        data: { isResolved },
      });
    },
  };
}
