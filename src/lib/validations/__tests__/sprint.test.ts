import { describe, it, expect } from "vitest";
import { createSprintSchema, updateSprintSchema } from "../sprint";

describe("Sprint Validation Schemas", () => {
  describe("createSprintSchema", () => {
    it("should accept valid sprint data with required fields", () => {
      const validData = {
        name: "Sprint 1",
        startDate: "2024-01-01",
        endDate: "2024-01-14",
      };

      const result = createSprintSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept valid sprint data with all fields", () => {
      const validData = {
        name: "Sprint 1",
        startDate: "2024-01-01",
        endDate: "2024-01-14",
        goal: "Complete user authentication flow",
      };

      const result = createSprintSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept ISO datetime format for dates", () => {
      const validData = {
        name: "Sprint 1",
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-14T23:59:59.999Z",
      };

      const result = createSprintSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
      const invalidData = {
        startDate: "2024-01-01",
        endDate: "2024-01-14",
      };

      const result = createSprintSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const invalidData = {
        name: "",
        startDate: "2024-01-01",
        endDate: "2024-01-14",
      };

      const result = createSprintSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing startDate", () => {
      const invalidData = {
        name: "Sprint 1",
        endDate: "2024-01-14",
      };

      const result = createSprintSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject missing endDate", () => {
      const invalidData = {
        name: "Sprint 1",
        startDate: "2024-01-01",
      };

      const result = createSprintSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const invalidData = {
        name: "Sprint 1",
        startDate: "01/01/2024",
        endDate: "14/01/2024",
      };

      const result = createSprintSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject goal exceeding max length", () => {
      const invalidData = {
        name: "Sprint 1",
        startDate: "2024-01-01",
        endDate: "2024-01-14",
        goal: "a".repeat(501),
      };

      const result = createSprintSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("updateSprintSchema", () => {
    it("should accept partial update with name only", () => {
      const validData = {
        name: "Updated Sprint Name",
      };

      const result = updateSprintSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept status update", () => {
      const validStatuses = ["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"];

      validStatuses.forEach((status) => {
        const result = updateSprintSchema.safeParse({ status });
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid status", () => {
      const invalidStatuses = ["DONE", "IN_PROGRESS", "ARCHIVED", ""];

      invalidStatuses.forEach((status) => {
        const result = updateSprintSchema.safeParse({ status });
        expect(result.success).toBe(false);
      });
    });

    it("should accept empty object (no updates)", () => {
      const validData = {};

      const result = updateSprintSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept combined updates", () => {
      const validData = {
        name: "Updated Sprint",
        status: "ACTIVE",
        goal: "New goal",
      };

      const result = updateSprintSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
