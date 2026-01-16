"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Invitation {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  expiresAt: string;
  createdAt: string;
  inviteUrl?: string;
  token?: string;
}

export interface InvitationDetails {
  id: string;
  email: string;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  expiresAt: string;
  team: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface CreateInvitationInput {
  email: string;
  role?: "ADMIN" | "MEMBER" | "VIEWER";
}

async function fetchInvitations(): Promise<Invitation[]> {
  const response = await fetch("/api/team/invitations");
  if (!response.ok) {
    throw new Error("Failed to fetch invitations");
  }
  return response.json();
}

async function createInvitation(
  data: CreateInvitationInput
): Promise<Invitation> {
  const response = await fetch("/api/team/invitations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create invitation");
  }
  return response.json();
}

async function cancelInvitation(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/team/invitations/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to cancel invitation");
  }
  return response.json();
}

async function fetchInvitationByToken(
  token: string
): Promise<InvitationDetails> {
  const response = await fetch(`/api/invitations/${token}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch invitation");
  }
  return response.json();
}

async function acceptInvitation(
  token: string
): Promise<{
  success: boolean;
  team: { id: string; name: string; slug: string; clerkOrgId?: string };
  role?: string;
  alreadyMember?: boolean;
}> {
  const response = await fetch(`/api/invitations/${token}/accept`, {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to accept invitation");
  }
  return response.json();
}

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: fetchInvitations,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    },
  });
}

export function useInvitationByToken(token: string) {
  return useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetchInvitationByToken(token),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: acceptInvitation,
  });
}
