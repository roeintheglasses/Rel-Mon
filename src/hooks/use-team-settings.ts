"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface TeamSettings {
  id: string;
  name: string;
  slug: string;
  slackWebhookUrl: string | null;
  slackChannel: string | null;
  notifyOnStatusChange: boolean;
  notifyOnBlocked: boolean;
  notifyOnReadyToDeploy: boolean;
  hasSlackWebhook: boolean;
}

export interface UpdateTeamSettingsInput {
  slackWebhookUrl?: string | null;
  slackChannel?: string | null;
  notifyOnStatusChange?: boolean;
  notifyOnBlocked?: boolean;
  notifyOnReadyToDeploy?: boolean;
}

async function fetchTeamSettings(): Promise<TeamSettings> {
  const response = await fetch("/api/team/settings");
  if (!response.ok) {
    throw new Error("Failed to fetch team settings");
  }
  return response.json();
}

async function updateTeamSettings(
  data: UpdateTeamSettingsInput
): Promise<TeamSettings> {
  const response = await fetch("/api/team/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update settings");
  }
  return response.json();
}

async function testSlackWebhook(): Promise<{ success: boolean }> {
  const response = await fetch("/api/team/settings/test-slack", {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to test webhook");
  }
  return response.json();
}

export function useTeamSettings() {
  return useQuery({
    queryKey: ["team-settings"],
    queryFn: fetchTeamSettings,
  });
}

export function useUpdateTeamSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTeamSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-settings"] });
    },
  });
}

export function useTestSlackWebhook() {
  return useMutation({
    mutationFn: testSlackWebhook,
  });
}
