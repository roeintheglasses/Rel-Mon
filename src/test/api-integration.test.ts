import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getReleases, POST as createRelease } from "@/app/api/v1/releases/route";
import {
  GET as getRelease,
  PATCH as updateRelease,
  DELETE as deleteRelease,
} from "@/app/api/v1/releases/[id]/route";
import {
  GET as getDependencies,
  POST as createDependency,
} from "@/app/api/v1/releases/[id]/dependencies/route";
import {
  GET as getSprints,
} from "@/app/api/v1/sprints/route";
import {
  GET as getSprint,
} from "@/app/api/v1/sprints/[id]/route";
import * as apiAuth from "@/lib/api-auth";
import * as rateLimit from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { ReleaseStatus, SprintStatus, DependencyType } from "@prisma/client";

// Mock modules
vi.mock("@/lib/api-auth");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    release: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    service: {
      findFirst: vi.fn(),
    },
    sprint: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    releaseDependency: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    team: {
      findUnique: vi.fn(),
    },
    deploymentGroup: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Test data
const mockTeam = {
  id: "team-1",
  clerkOrgId: "org_test123",
  name: "Test Team",
  slug: "test-team",
  settings: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockApiKey = {
  id: "key-1",
  teamId: "team-1",
  name: "Test API Key",
  key: "hashed-key",
  scopes: ["releases:read", "releases:write", "sprints:read", "dependencies:read", "dependencies:write"],
  isActive: true,
  lastUsedAt: new Date(),
  expiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockService = {
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
};

const mockRelease = {
  id: "release-1",
  teamId: "team-1",
  serviceId: "service-1",
  sprintId: null,
  deploymentGroupId: null,
  ownerId: null,
  title: "v1.0.0 Release",
  description: "Test release",
  version: "1.0.0",
  status: "IN_DEVELOPMENT" as ReleaseStatus,
  statusChangedAt: new Date(),
  priority: "MEDIUM" as any,
  isHotfix: false,
  isBlocked: false,
  blockedReason: null,
  targetDate: null,
  stagingDeployedAt: null,
  prodDeployedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  service: mockService,
  sprint: null,
  owner: null,
  _count: {
    items: 0,
    dependsOn: 0,
    dependents: 0,
  },
};

const mockSprint = {
  id: "sprint-1",
  teamId: "team-1",
  name: "Sprint 1",
  status: "ACTIVE" as SprintStatus,
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-01-15"),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDependency = {
  id: "dep-1",
  releaseId: "release-1",
  dependsOnReleaseId: "release-2",
  type: "BLOCKS" as DependencyType,
  description: "Must deploy after release-2",
  isResolved: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Helper to create mock request
function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): NextRequest {
  const { method = "GET", headers = {}, body } = options;
  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
}

describe("API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimit.clearAllRateLimits();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should reject request without API key", async () => {
      vi.spyOn(apiAuth, "validateApiKey").mockResolvedValue(null);

      const request = createMockRequest("http://localhost:3000/api/v1/releases");
      const response = await getReleases(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
      expect(response.headers.get("WWW-Authenticate")).toContain("ApiKey");
    });

    it("should reject request with invalid API key", async () => {
      vi.spyOn(apiAuth, "validateApiKey").mockResolvedValue(null);

      const request = createMockRequest("http://localhost:3000/api/v1/releases", {
        headers: { "X-API-Key": "invalid-key" },
      });
      const response = await getReleases(request, {});
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Unauthorized");
    });

    it("should accept request with valid API key", async () => {
      vi.spyOn(apiAuth, "validateApiKey").mockResolvedValue({
        team: mockTeam,
        apiKey: mockApiKey,
      });
      vi.spyOn(rateLimit, "checkRateLimit").mockReturnValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
      });
      vi.mocked(prisma.release.findMany).mockResolvedValue([mockRelease]);
      vi.mocked(prisma.release.count).mockResolvedValue(1);

      const request = createMockRequest("http://localhost:3000/api/v1/releases", {
        headers: { "X-API-Key": "relmon_validkey123" },
      });
      const response = await getReleases(request, {});

      expect(response.status).toBe(200);
      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      vi.spyOn(apiAuth, "validateApiKey").mockResolvedValue({
        team: mockTeam,
        apiKey: mockApiKey,
      });
      // Clear rate limits before each test
      rateLimit.clearAllRateLimits();
    });

    it("should enforce 100 requests per minute limit", async () => {
      vi.mocked(prisma.release.findMany).mockResolvedValue([]);

      // Mock the rate limiter to simulate hitting the limit
      vi.spyOn(rateLimit, "checkRateLimit").mockReturnValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
      });

      const request = createMockRequest("http://localhost:3000/api/v1/releases", {
        headers: { "X-API-Key": "relmon_validkey123" },
      });
      const response = await getReleases(request, {});
      const data = await response.json();

      // Verify rate limit response
      expect(response.status).toBe(429);
      expect(data.error).toContain("Rate limit exceeded");
      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("Retry-After")).toBeDefined();

      // Verify checkRateLimit was called with correct key
      expect(rateLimit.checkRateLimit).toHaveBeenCalledWith(mockApiKey.id);
    });

    it("should include rate limit headers in responses", async () => {
      vi.spyOn(rateLimit, "checkRateLimit").mockReturnValue({
        allowed: true,
        remaining: 95,
        resetAt: new Date(Date.now() + 60000),
      });
      vi.mocked(prisma.release.findMany).mockResolvedValue([]);
      vi.mocked(prisma.release.count).mockResolvedValue(0);

      const request = createMockRequest("http://localhost:3000/api/v1/releases", {
        headers: { "X-API-Key": "relmon_validkey123" },
      });
      const response = await getReleases(request, {});

      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("95");
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });
  });

  describe("Releases API", () => {
    beforeEach(() => {
      vi.spyOn(apiAuth, "validateApiKey").mockResolvedValue({
        team: mockTeam,
        apiKey: mockApiKey,
      });
      vi.spyOn(rateLimit, "checkRateLimit").mockReturnValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
      });
    });

    describe("GET /api/v1/releases", () => {
      it("should list releases for authenticated team with pagination", async () => {
        vi.mocked(prisma.release.findMany).mockResolvedValue([mockRelease]);
        vi.mocked(prisma.release.count).mockResolvedValue(1);

        const request = createMockRequest("http://localhost:3000/api/v1/releases", {
          headers: { "X-API-Key": "relmon_validkey123" },
        });
        const response = await getReleases(request, {});
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data).toHaveLength(1);
        expect(data.data[0].id).toBe("release-1");
        expect(data.pagination).toBeDefined();
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.totalCount).toBe(1);
        expect(prisma.release.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ teamId: "team-1" }),
            skip: 0,
            take: 50,
          })
        );
      });

      it("should filter releases by status", async () => {
        vi.mocked(prisma.release.findMany).mockResolvedValue([mockRelease]);
        vi.mocked(prisma.release.count).mockResolvedValue(1);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases?status=IN_DEVELOPMENT",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        await getReleases(request, {});

        expect(prisma.release.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: "IN_DEVELOPMENT",
            }),
          })
        );
      });

      it("should return 400 for invalid status filter", async () => {
        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases?status=INVALID_STATUS",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        const response = await getReleases(request, {});
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("Invalid status");
        expect(data.validStatuses).toBeDefined();
      });

      it("should filter releases by serviceId", async () => {
        vi.mocked(prisma.release.findMany).mockResolvedValue([mockRelease]);
        vi.mocked(prisma.release.count).mockResolvedValue(1);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases?serviceId=service-1",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        await getReleases(request, {});

        expect(prisma.release.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              serviceId: "service-1",
            }),
          })
        );
      });

      it("should support pagination parameters", async () => {
        vi.mocked(prisma.release.findMany).mockResolvedValue([mockRelease]);
        vi.mocked(prisma.release.count).mockResolvedValue(100);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases?page=2&limit=10",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        const response = await getReleases(request, {});
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.pagination.page).toBe(2);
        expect(data.pagination.limit).toBe(10);
        expect(data.pagination.totalPages).toBe(10);
        expect(data.pagination.hasNextPage).toBe(true);
        expect(data.pagination.hasPreviousPage).toBe(true);
        expect(prisma.release.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 10,
            take: 10,
          })
        );
      });

      it("should cap limit at maximum of 100", async () => {
        vi.mocked(prisma.release.findMany).mockResolvedValue([]);
        vi.mocked(prisma.release.count).mockResolvedValue(0);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases?limit=500",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        const response = await getReleases(request, {});
        const data = await response.json();

        expect(data.pagination.limit).toBe(100);
        expect(prisma.release.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 100,
          })
        );
      });
    });

    describe("POST /api/v1/releases", () => {
      it("should create a new release", async () => {
        vi.mocked(prisma.service.findFirst).mockResolvedValue(mockService);
        vi.mocked(prisma.release.create).mockResolvedValue(mockRelease);

        const request = createMockRequest("http://localhost:3000/api/v1/releases", {
          method: "POST",
          headers: { "X-API-Key": "relmon_validkey123" },
          body: {
            title: "v1.0.0 Release",
            serviceId: "service-1",
          },
        });
        const response = await createRelease(request, {});
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.title).toBe("v1.0.0 Release");
        expect(prisma.release.create).toHaveBeenCalled();
      });

      it("should reject creation with invalid serviceId", async () => {
        vi.mocked(prisma.service.findFirst).mockResolvedValue(null);

        const request = createMockRequest("http://localhost:3000/api/v1/releases", {
          method: "POST",
          headers: { "X-API-Key": "relmon_validkey123" },
          body: {
            title: "v1.0.0 Release",
            serviceId: "invalid-service",
          },
        });
        const response = await createRelease(request, {});
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain("Service not found");
      });
    });

    describe("GET /api/v1/releases/:id", () => {
      it("should retrieve a specific release", async () => {
        vi.mocked(prisma.release.findFirst).mockResolvedValue({
          ...mockRelease,
          items: [],
          dependsOn: [],
          dependents: [],
          activities: [],
          comments: [],
        } as any);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases/release-1",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        const response = await getRelease(request, { params: { id: "release-1" } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.id).toBe("release-1");
      });

      it("should return 404 for non-existent release", async () => {
        vi.mocked(prisma.release.findFirst).mockResolvedValue(null);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases/invalid-id",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        const response = await getRelease(request, { params: { id: "invalid-id" } });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain("Release not found");
      });
    });

    describe("PATCH /api/v1/releases/:id", () => {
      it("should update a release status", async () => {
        vi.mocked(prisma.release.findFirst).mockResolvedValue(mockRelease);
        vi.mocked(prisma.release.update).mockResolvedValue({
          ...mockRelease,
          status: "IN_REVIEW" as ReleaseStatus,
        });
        vi.mocked(prisma.activity.create).mockResolvedValue({} as any);
        vi.mocked(prisma.user.findMany).mockResolvedValue([]);
        vi.mocked(prisma.team.findUnique).mockResolvedValue(mockTeam);
        vi.mocked(prisma.deploymentGroup.findMany).mockResolvedValue([]);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases/release-1",
          {
            method: "PATCH",
            headers: { "X-API-Key": "relmon_validkey123" },
            body: { status: "IN_REVIEW" },
          }
        );
        const response = await updateRelease(request, { params: { id: "release-1" } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe("IN_REVIEW");
      });
    });

    describe("DELETE /api/v1/releases/:id", () => {
      it("should delete a release", async () => {
        vi.mocked(prisma.release.findFirst).mockResolvedValue(mockRelease);
        vi.mocked(prisma.release.delete).mockResolvedValue(mockRelease);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases/release-1",
          {
            method: "DELETE",
            headers: { "X-API-Key": "relmon_validkey123" },
          }
        );
        const response = await deleteRelease(request, { params: { id: "release-1" } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });

      it("should return 404 when deleting non-existent release", async () => {
        vi.mocked(prisma.release.findFirst).mockResolvedValue(null);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases/invalid-id",
          {
            method: "DELETE",
            headers: { "X-API-Key": "relmon_validkey123" },
          }
        );
        const response = await deleteRelease(request, { params: { id: "invalid-id" } });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain("Release not found");
      });
    });
  });

  describe("Dependencies API", () => {
    beforeEach(() => {
      vi.spyOn(apiAuth, "validateApiKey").mockResolvedValue({
        team: mockTeam,
        apiKey: mockApiKey,
      });
      vi.spyOn(rateLimit, "checkRateLimit").mockReturnValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
      });
    });

    describe("GET /api/v1/releases/:id/dependencies", () => {
      it("should list dependencies for a release", async () => {
        vi.mocked(prisma.release.findFirst).mockResolvedValue(mockRelease);
        vi.mocked(prisma.releaseDependency.findMany).mockResolvedValue([
          {
            ...mockDependency,
            release: mockRelease,
            dependsOnRelease: mockRelease,
          } as any,
        ]);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases/release-1/dependencies",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        const response = await getDependencies(request, {
          params: { id: "release-1" },
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.dependsOn).toBeDefined();
        expect(data.dependents).toBeDefined();
      });
    });

    describe("POST /api/v1/releases/:id/dependencies", () => {
      it("should create a new dependency", async () => {
        const mockRelease2 = { ...mockRelease, id: "release-2", title: "v2.0.0 Release" };

        vi.mocked(prisma.release.findFirst)
          .mockResolvedValueOnce(mockRelease)
          .mockResolvedValueOnce(mockRelease2);
        vi.mocked(prisma.releaseDependency.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.releaseDependency.findMany).mockResolvedValue([]);
        vi.mocked(prisma.releaseDependency.create).mockResolvedValue({
          ...mockDependency,
          dependentReleaseId: "release-1",
          blockingReleaseId: "release-2",
          dependentRelease: mockRelease,
          blockingRelease: {
            ...mockRelease2,
            service: mockService,
          },
        } as any);
        vi.mocked(prisma.activity.create).mockResolvedValue({} as any);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases/release-1/dependencies",
          {
            method: "POST",
            headers: { "X-API-Key": "relmon_validkey123" },
            body: {
              blockingReleaseId: "release-2",
              type: "BLOCKS",
            },
          }
        );
        const response = await createDependency(request, {
          params: { id: "release-1" },
        });
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.release.id).toBe("release-2");
        expect(data.type).toBe("BLOCKS");
      });

      it("should reject self-dependency", async () => {
        vi.mocked(prisma.release.findFirst).mockResolvedValue(mockRelease);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/releases/release-1/dependencies",
          {
            method: "POST",
            headers: { "X-API-Key": "relmon_validkey123" },
            body: {
              blockingReleaseId: "release-1",
              type: "BLOCKS",
            },
          }
        );
        const response = await createDependency(request, {
          params: { id: "release-1" },
        });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("cannot depend on itself");
      });
    });
  });

  describe("Sprints API", () => {
    beforeEach(() => {
      vi.spyOn(apiAuth, "validateApiKey").mockResolvedValue({
        team: mockTeam,
        apiKey: mockApiKey,
      });
      vi.spyOn(rateLimit, "checkRateLimit").mockReturnValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(Date.now() + 60000),
      });
    });

    describe("GET /api/v1/sprints", () => {
      it("should list sprints for authenticated team", async () => {
        vi.mocked(prisma.sprint.findMany).mockResolvedValue([mockSprint]);

        const request = createMockRequest("http://localhost:3000/api/v1/sprints", {
          headers: { "X-API-Key": "relmon_validkey123" },
        });
        const response = await getSprints(request, {});
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe("sprint-1");
        expect(prisma.sprint.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ teamId: "team-1" }),
          })
        );
      });

      it("should filter sprints by status", async () => {
        vi.mocked(prisma.sprint.findMany).mockResolvedValue([mockSprint]);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/sprints?status=ACTIVE",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        await getSprints(request, {});

        expect(prisma.sprint.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: "ACTIVE",
            }),
          })
        );
      });
    });

    describe("GET /api/v1/sprints/:id", () => {
      it("should retrieve a specific sprint", async () => {
        vi.mocked(prisma.sprint.findFirst).mockResolvedValue({
          ...mockSprint,
          releases: [],
        } as any);

        const request = createMockRequest("http://localhost:3000/api/v1/sprints/sprint-1", {
          headers: { "X-API-Key": "relmon_validkey123" },
        });
        const response = await getSprint(request, { params: { id: "sprint-1" } });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.id).toBe("sprint-1");
      });

      it("should return 404 for non-existent sprint", async () => {
        vi.mocked(prisma.sprint.findFirst).mockResolvedValue(null);

        const request = createMockRequest(
          "http://localhost:3000/api/v1/sprints/invalid-id",
          { headers: { "X-API-Key": "relmon_validkey123" } }
        );
        const response = await getSprint(request, { params: { id: "invalid-id" } });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain("Sprint not found");
      });
    });
  });
});
