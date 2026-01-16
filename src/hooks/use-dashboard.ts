"use client";

import { useQuery } from "@tanstack/react-query";

export interface DashboardStats {
  totalReleases: number;
  releasesInProgress: number;
  releasesReadyToDeploy: number;
  blockedReleases: number;
  deployedThisMonth: number;
  myReleases: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  action: string;
  description: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  release: {
    id: string;
    title: string;
    service: {
      name: string;
      color: string;
    };
  } | null;
}

export interface UpcomingDeployment {
  id: string;
  title: string;
  status: string;
  statusChangedAt: string;
  service: {
    name: string;
    color: string;
  };
  owner: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
}

export interface DashboardData {
  stats: DashboardStats;
  activeSprint: { id: string; name: string } | null;
  releasesByStatus: { status: string; count: number }[];
  recentActivities: DashboardActivity[];
  upcomingDeployments: UpcomingDeployment[];
}

async function fetchDashboardStats(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard/stats");
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard stats");
  }
  return response.json();
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardStats,
    refetchInterval: 60000, // Refetch every minute
  });
}
