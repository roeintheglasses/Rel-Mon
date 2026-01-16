import { describe, it, expect } from "vitest";
import {
  createReleaseSchema,
  updateReleaseSchema,
  releaseStatusEnum,
} from "../release";

describe("Release Validation Schemas", () => {
  describe("releaseStatusEnum", () => {
    it("should accept valid status values", () => {
      const validStatuses = [
        "PLANNING",
        "IN_DEVELOPMENT",
        "IN_REVIEW",
        "READY_STAGING",
        "IN_STAGING",
        "STAGING_VERIFIED",
        "READY_PRODUCTION",
        "DEPLOYED",
        "CANCELLED",
        "ROLLED_BACK",
      ];

      validStatuses.forEach((status) => {
        const result = releaseStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid status values", () => {
      const invalidStatuses = ["INVALID", "pending", "DONE", ""];

      invalidStatuses.forEach((status) => {
        const result = releaseStatusEnum.safeParse(status);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("createReleaseSchema", () => {
    it("should accept valid release data", () => {
      const validData = {
        title: "v1.0.0 Release",
        serviceId: "service-123",
      };

      const result = createReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept full release data with optional fields", () => {
      const validData = {
        title: "v1.0.0 Release",
        description: "Initial release with core features",
        serviceId: "service-123",
        sprintId: "sprint-456",
        version: "1.0.0",
        targetDate: "2024-12-31",
      };

      const result = createReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject missing title", () => {
      const invalidData = {
        serviceId: "service-123",
      };

      const result = createReleaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty title", () => {
      const invalidData = {
        title: "",
        serviceId: "service-123",
      };

      const result = createReleaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing serviceId", () => {
      const invalidData = {
        title: "v1.0.0 Release",
      };

      const result = createReleaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject title exceeding max length", () => {
      const invalidData = {
        title: "a".repeat(201),
        serviceId: "service-123",
      };

      const result = createReleaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject description exceeding max length", () => {
      const invalidData = {
        title: "v1.0.0 Release",
        description: "a".repeat(2001),
        serviceId: "service-123",
      };

      const result = createReleaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept ISO datetime format for targetDate", () => {
      const validData = {
        title: "v1.0.0 Release",
        serviceId: "service-123",
        targetDate: "2024-12-31T23:59:59.999Z",
      };

      const result = createReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept date-only format for targetDate", () => {
      const validData = {
        title: "v1.0.0 Release",
        serviceId: "service-123",
        targetDate: "2024-12-31",
      };

      const result = createReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("updateReleaseSchema", () => {
    it("should accept partial update with status", () => {
      const validData = {
        status: "IN_DEVELOPMENT",
      };

      const result = updateReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept partial update with title", () => {
      const validData = {
        title: "Updated Title",
      };

      const result = updateReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept isBlocked field", () => {
      const validData = {
        isBlocked: true,
        blockedReason: "Waiting for dependency",
      };

      const result = updateReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept null blockedReason", () => {
      const validData = {
        isBlocked: false,
        blockedReason: null,
      };

      const result = updateReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid status in update", () => {
      const invalidData = {
        status: "INVALID_STATUS",
      };

      const result = updateReleaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept empty object (no updates)", () => {
      const validData = {};

      const result = updateReleaseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject blockedReason exceeding max length", () => {
      const invalidData = {
        blockedReason: "a".repeat(501),
      };

      const result = updateReleaseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
