import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendSlackMessage,
  buildStatusChangeMessage,
  buildReadyToDeployMessage,
  buildBlockedMessage,
  buildUnblockedMessage,
} from "../slack-client";
import { ReleaseStatus, ReleasePriority } from "@prisma/client";

// Mock release data
const mockRelease = {
  id: "release-1",
  teamId: "team-1",
  serviceId: "service-1",
  sprintId: "sprint-1",
  deploymentGroupId: null,
  ownerId: "user-1",
  title: "v1.0.0 Release",
  description: "Test release",
  version: "1.0.0",
  status: "IN_DEVELOPMENT" as ReleaseStatus,
  statusChangedAt: new Date(),
  priority: "MEDIUM" as ReleasePriority,
  isHotfix: false,
  isBlocked: false,
  blockedReason: null,
  targetDate: null,
  stagingDeployedAt: null,
  prodDeployedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  service: {
    id: "service-1",
    teamId: "team-1",
    name: "API Service",
    slug: "api-service",
    description: null,
    repoOwner: null,
    repoName: null,
    repoUrl: null,
    jiraProjectKey: null,
    color: "#6366f1",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  owner: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
  },
};

const mockReleaseNoOwner = {
  ...mockRelease,
  owner: null,
};

describe("Slack Client", () => {
  describe("sendSlackMessage", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should send message successfully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("ok"),
      });

      const result = await sendSlackMessage("https://hooks.slack.com/test", {
        text: "Test message",
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/test",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should return error on failed response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("invalid_payload"),
      });

      const result = await sendSlackMessage("https://hooks.slack.com/test", {
        text: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("invalid_payload");
    });

    it("should return error on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await sendSlackMessage("https://hooks.slack.com/test", {
        text: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should include channel in message body if provided", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("ok"),
      });

      await sendSlackMessage("https://hooks.slack.com/test", {
        text: "Test message",
        channel: "#releases",
      });

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.channel).toBe("#releases");
    });
  });

  describe("buildStatusChangeMessage", () => {
    it("should build message with correct structure", () => {
      const message = buildStatusChangeMessage(
        mockRelease,
        "PLANNING" as ReleaseStatus,
        "IN_DEVELOPMENT" as ReleaseStatus,
        "https://app.example.com"
      );

      expect(message.text).toContain("v1.0.0 Release");
      expect(message.text).toContain("In Development");
      expect(message.blocks).toBeDefined();
      expect(message.blocks?.length).toBeGreaterThan(0);
    });

    it("should include release URL in action button", () => {
      const message = buildStatusChangeMessage(
        mockRelease,
        "PLANNING" as ReleaseStatus,
        "IN_DEVELOPMENT" as ReleaseStatus,
        "https://app.example.com"
      );

      const actionsBlock = message.blocks?.find((b) => b.type === "actions");
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock?.elements?.[0]?.url).toBe(
        "https://app.example.com/releases/release-1"
      );
    });

    it("should show owner name when available", () => {
      const message = buildStatusChangeMessage(
        mockRelease,
        "PLANNING" as ReleaseStatus,
        "IN_DEVELOPMENT" as ReleaseStatus,
        "https://app.example.com"
      );

      const sectionBlock = message.blocks?.find((b) => b.type === "section");
      const ownerField = sectionBlock?.fields?.find((f) =>
        f.text.includes("Owner")
      );
      expect(ownerField?.text).toContain("John Doe");
    });

    it("should show 'Unassigned' when no owner", () => {
      const message = buildStatusChangeMessage(
        mockReleaseNoOwner,
        "PLANNING" as ReleaseStatus,
        "IN_DEVELOPMENT" as ReleaseStatus,
        "https://app.example.com"
      );

      const sectionBlock = message.blocks?.find((b) => b.type === "section");
      const ownerField = sectionBlock?.fields?.find((f) =>
        f.text.includes("Owner")
      );
      expect(ownerField?.text).toContain("Unassigned");
    });

    it("should include appropriate emoji for status", () => {
      const message = buildStatusChangeMessage(
        mockRelease,
        "IN_DEVELOPMENT" as ReleaseStatus,
        "DEPLOYED" as ReleaseStatus,
        "https://app.example.com"
      );

      expect(message.text).toContain("🎉");
    });
  });

  describe("buildReadyToDeployMessage", () => {
    it("should build staging message correctly", () => {
      const message = buildReadyToDeployMessage(
        mockRelease,
        "staging",
        "https://app.example.com"
      );

      expect(message.text).toContain("Staging");
      expect(message.text).toContain("🎯");
    });

    it("should build production message correctly", () => {
      const message = buildReadyToDeployMessage(
        mockRelease,
        "production",
        "https://app.example.com"
      );

      expect(message.text).toContain("Production");
      expect(message.text).toContain("🚀");
    });

    it("should include link to ready-to-deploy queue", () => {
      const message = buildReadyToDeployMessage(
        mockRelease,
        "staging",
        "https://app.example.com"
      );

      const actionsBlock = message.blocks?.find((b) => b.type === "actions");
      const queueButton = actionsBlock?.elements?.find((e) =>
        e.url?.includes("ready-to-deploy")
      );
      expect(queueButton).toBeDefined();
    });
  });

  describe("buildBlockedMessage", () => {
    it("should include blocked reason", () => {
      const message = buildBlockedMessage(
        mockRelease,
        "Waiting for dependency release",
        "https://app.example.com"
      );

      expect(message.text).toContain("blocked");
      const reasonSection = message.blocks?.find(
        (b) => b.type === "section" && b.text?.text.includes("Reason")
      );
      expect(reasonSection?.text?.text).toContain(
        "Waiting for dependency release"
      );
    });

    it("should include warning emoji", () => {
      const message = buildBlockedMessage(
        mockRelease,
        "Dependency blocked",
        "https://app.example.com"
      );

      expect(message.text).toContain("⚠️");
    });

    it("should include link to blocked releases page", () => {
      const message = buildBlockedMessage(
        mockRelease,
        "Dependency blocked",
        "https://app.example.com"
      );

      const actionsBlock = message.blocks?.find((b) => b.type === "actions");
      const blockedButton = actionsBlock?.elements?.find((e) =>
        e.url?.includes("/blocked")
      );
      expect(blockedButton).toBeDefined();
    });
  });

  describe("buildUnblockedMessage", () => {
    it("should indicate release is unblocked", () => {
      const message = buildUnblockedMessage(
        mockRelease,
        "https://app.example.com"
      );

      expect(message.text).toContain("no longer blocked");
      expect(message.text).toContain("✅");
    });

    it("should include release details", () => {
      const message = buildUnblockedMessage(
        mockRelease,
        "https://app.example.com"
      );

      const sectionBlock = message.blocks?.find((b) => b.fields);
      expect(sectionBlock?.fields?.some((f) => f.text.includes("API Service"))).toBe(
        true
      );
    });
  });
});
