"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateServiceInput, UpdateServiceInput } from "@/lib/validations/service";

export interface Service {
  id: string;
  teamId: string;
  name: string;
  slug: string;
  description: string | null;
  repoOwner: string | null;
  repoName: string | null;
  repoUrl: string | null;
  jiraProjectKey: string | null;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    releases: number;
  };
}

async function fetchServices(): Promise<Service[]> {
  const response = await fetch("/api/services");
  if (!response.ok) {
    throw new Error("Failed to fetch services");
  }
  return response.json();
}

async function fetchService(id: string): Promise<Service> {
  const response = await fetch(`/api/services/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch service");
  }
  return response.json();
}

async function createService(data: CreateServiceInput): Promise<Service> {
  const response = await fetch("/api/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create service");
  }
  return response.json();
}

async function updateService({
  id,
  data,
}: {
  id: string;
  data: UpdateServiceInput;
}): Promise<Service> {
  const response = await fetch(`/api/services/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update service");
  }
  return response.json();
}

async function deleteService(id: string): Promise<void> {
  const response = await fetch(`/api/services/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete service");
  }
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: ["services", id],
    queryFn: () => fetchService(id),
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateService,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["services", data.id] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
  });
}
