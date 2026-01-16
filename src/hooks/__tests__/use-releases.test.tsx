import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useReleases,
  useRelease,
  useCreateRelease,
  useUpdateRelease,
  useDeleteRelease,
} from "../use-releases";

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

describe("useReleases hook", () => {
  it("should fetch releases successfully", async () => {
    const { result } = renderHook(() => useReleases(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it("should return loading state initially", () => {
    const { result } = renderHook(() => useReleases(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("should support filtering by sprint", async () => {
    const { result } = renderHook(
      () => useReleases({ sprintId: "sprint-1" }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });

  it("should support filtering by blocked status", async () => {
    const { result } = renderHook(() => useReleases({ isBlocked: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe("useRelease hook", () => {
  it("should fetch single release successfully", async () => {
    const { result } = renderHook(() => useRelease("release-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.id).toBe("release-1");
  });

  it("should not fetch when id is empty", () => {
    const { result } = renderHook(() => useRelease(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});

describe("useCreateRelease hook", () => {
  it("should create release successfully", async () => {
    const { result } = renderHook(() => useCreateRelease(), {
      wrapper: createWrapper(),
    });

    const newRelease = await result.current.mutateAsync({
      title: "New Release",
      serviceId: "service-1",
    });

    expect(newRelease).toBeDefined();
    expect(newRelease.title).toBe("New Release");
  });
});

describe("useUpdateRelease hook", () => {
  it("should update release status", async () => {
    const { result } = renderHook(() => useUpdateRelease(), {
      wrapper: createWrapper(),
    });

    const updatedRelease = await result.current.mutateAsync({
      id: "release-1",
      data: { status: "IN_REVIEW" },
    });

    expect(updatedRelease).toBeDefined();
    expect(updatedRelease.status).toBe("IN_REVIEW");
  });

  it("should update release blocked status", async () => {
    const { result } = renderHook(() => useUpdateRelease(), {
      wrapper: createWrapper(),
    });

    const updatedRelease = await result.current.mutateAsync({
      id: "release-1",
      data: { isBlocked: true, blockedReason: "Waiting for approval" },
    });

    expect(updatedRelease).toBeDefined();
  });
});

describe("useDeleteRelease hook", () => {
  it("should delete release successfully", async () => {
    const { result } = renderHook(() => useDeleteRelease(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync("release-1")
    ).resolves.not.toThrow();
  });
});
