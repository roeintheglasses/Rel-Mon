"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CommentUser {
  id: string;
  clerkUserId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface Comment {
  id: string;
  releaseId: string;
  userId: string;
  content: string;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
}

async function fetchComments(releaseId: string): Promise<Comment[]> {
  const response = await fetch(`/api/releases/${releaseId}/comments`);
  if (!response.ok) {
    throw new Error("Failed to fetch comments");
  }
  return response.json();
}

async function createComment({
  releaseId,
  content,
}: {
  releaseId: string;
  content: string;
}): Promise<Comment> {
  const response = await fetch(`/api/releases/${releaseId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create comment");
  }
  return response.json();
}

async function updateComment({
  releaseId,
  commentId,
  content,
}: {
  releaseId: string;
  commentId: string;
  content: string;
}): Promise<Comment> {
  const response = await fetch(
    `/api/releases/${releaseId}/comments/${commentId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update comment");
  }
  return response.json();
}

async function deleteComment({
  releaseId,
  commentId,
}: {
  releaseId: string;
  commentId: string;
}): Promise<void> {
  const response = await fetch(
    `/api/releases/${releaseId}/comments/${commentId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete comment");
  }
}

export function useComments(releaseId: string) {
  return useQuery({
    queryKey: ["comments", releaseId],
    queryFn: () => fetchComments(releaseId),
    enabled: !!releaseId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["comments", data.releaseId] });
      queryClient.invalidateQueries({ queryKey: ["activities", data.releaseId] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateComment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["comments", data.releaseId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteComment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.releaseId] });
    },
  });
}
