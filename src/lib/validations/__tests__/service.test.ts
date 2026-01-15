import { describe, it, expect } from "vitest";
import { createServiceSchema, updateServiceSchema } from "../service";

describe("Service Validation Schemas", () => {
  describe("createServiceSchema", () => {
    it("should accept valid service data with required fields only", () => {
      const validData = {
        name: "API Service",
      };

      const result = createServiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept valid service data with all fields", () => {
      const validData = {
        name: "API Service",
        description: "Main API service for the application",
        repoOwner: "my-org",
        repoName: "api-service",
        repoUrl: "https://github.com/my-org/api-service",
        jiraProjectKey: "API",
        color: "#6366f1",
      };

      const result = createServiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject missing name", () => {
      const invalidData = {
        description: "Some service",
      };

      const result = createServiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const invalidData = {
        name: "",
      };

      const result = createServiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject name exceeding max length", () => {
      const invalidData = {
        name: "a".repeat(101),
      };

      const result = createServiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid color format", () => {
      const invalidColors = ["red", "#fff", "#12345", "#GGGGGG", "6366f1"];

      invalidColors.forEach((color) => {
        const result = createServiceSchema.safeParse({
          name: "Service",
          color,
        });
        expect(result.success).toBe(false);
      });
    });

    it("should accept valid hex color formats", () => {
      const validColors = ["#000000", "#FFFFFF", "#6366f1", "#abc123", "#ABC123"];

      validColors.forEach((color) => {
        const result = createServiceSchema.safeParse({
          name: "Service",
          color,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should accept empty string for repoUrl", () => {
      const validData = {
        name: "API Service",
        repoUrl: "",
      };

      const result = createServiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL for repoUrl", () => {
      const invalidData = {
        name: "API Service",
        repoUrl: "not-a-url",
      };

      const result = createServiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("updateServiceSchema", () => {
    it("should accept partial update with name only", () => {
      const validData = {
        name: "Updated Service Name",
      };

      const result = updateServiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept partial update with description only", () => {
      const validData = {
        description: "Updated description",
      };

      const result = updateServiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should accept empty object (no updates)", () => {
      const validData = {};

      const result = updateServiceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid color in update", () => {
      const invalidData = {
        color: "invalid",
      };

      const result = updateServiceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
