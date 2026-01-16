import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useInvitations,
  useCreateInvitation,
  useCancelInvitation,
  useInvitationByToken,
  useAcceptInvitation,
} from "../use-invitations";

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

describe("useInvitations hook", () => {
  it("should fetch invitations successfully", async () => {
    const { result } = renderHook(() => useInvitations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe("useCreateInvitation hook", () => {
  it("should create invitation successfully", async () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createWrapper(),
    });

    const invitation = await result.current.mutateAsync({
      email: "newuser@example.com",
      role: "MEMBER",
    });

    expect(invitation).toBeDefined();
    expect(invitation.email).toBe("newuser@example.com");
    expect(invitation.inviteUrl).toBeDefined();
  });

  it("should create admin invitation", async () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createWrapper(),
    });

    const invitation = await result.current.mutateAsync({
      email: "admin@example.com",
      role: "ADMIN",
    });

    expect(invitation).toBeDefined();
    expect(invitation.role).toBe("ADMIN");
  });
});

describe("useCancelInvitation hook", () => {
  it("should cancel invitation successfully", async () => {
    const { result } = renderHook(() => useCancelInvitation(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync("invitation-1")
    ).resolves.not.toThrow();
  });
});

describe("useInvitationByToken hook", () => {
  it("should fetch invitation by token", async () => {
    const { result } = renderHook(
      () => useInvitationByToken("test-token-123"),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.team).toBeDefined();
    expect(result.current.data?.email).toBeDefined(); // Masked email
  });

  it("should not fetch with empty token", () => {
    const { result } = renderHook(() => useInvitationByToken(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});

describe("useAcceptInvitation hook", () => {
  it("should accept invitation successfully", async () => {
    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync("test-token-123");

    expect(response.success).toBe(true);
    expect(response.team).toBeDefined();
  });
});
