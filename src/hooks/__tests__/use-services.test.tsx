import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "../use-services";

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

describe("useServices hook", () => {
  it("should fetch services successfully", async () => {
    const { result } = renderHook(() => useServices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it("should return loading state initially", () => {
    const { result } = renderHook(() => useServices(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });
});

describe("useCreateService hook", () => {
  it("should create service successfully", async () => {
    const { result } = renderHook(() => useCreateService(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.mutateAsync).toBeDefined();
    });

    const newService = await result.current.mutateAsync({
      name: "New Service",
      description: "Test description",
    });

    expect(newService).toBeDefined();
    expect(newService.name).toBe("New Service");
  });
});

describe("useUpdateService hook", () => {
  it("should update service successfully", async () => {
    const { result } = renderHook(() => useUpdateService(), {
      wrapper: createWrapper(),
    });

    const updatedService = await result.current.mutateAsync({
      id: "service-1",
      data: { name: "Updated Service" },
    });

    expect(updatedService).toBeDefined();
    expect(updatedService.name).toBe("Updated Service");
  });
});

describe("useDeleteService hook", () => {
  it("should delete service successfully", async () => {
    const { result } = renderHook(() => useDeleteService(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync("service-1")).resolves.not.toThrow();
  });
});
