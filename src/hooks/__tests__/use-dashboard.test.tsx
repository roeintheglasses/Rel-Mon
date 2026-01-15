import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useDashboard } from "../use-dashboard";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useDashboard hook", () => {
  it("should fetch dashboard stats successfully", async () => {
    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.stats).toBeDefined();
  });

  it("should return loading state initially", () => {
    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("should include stats in response", async () => {
    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const stats = result.current.data?.stats;
    expect(stats).toHaveProperty("totalReleases");
    expect(stats).toHaveProperty("releasesInProgress");
    expect(stats).toHaveProperty("releasesReadyToDeploy");
    expect(stats).toHaveProperty("blockedReleases");
    expect(stats).toHaveProperty("deployedThisMonth");
    expect(stats).toHaveProperty("myReleases");
  });

  it("should include active sprint info", async () => {
    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.activeSprint).toBeDefined();
    expect(result.current.data?.activeSprint?.name).toBe("Sprint 1");
  });

  it("should include releases by status", async () => {
    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.releasesByStatus).toBeDefined();
    expect(Array.isArray(result.current.data?.releasesByStatus)).toBe(true);
  });
});
