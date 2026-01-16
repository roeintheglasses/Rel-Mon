import { http, HttpResponse } from "msw";

// Mock data
export const mockTeam = {
  id: "team-1",
  clerkOrgId: "test-org-id",
  name: "Test Team",
  slug: "test-team",
  slackWebhookUrl: null,
  slackChannel: null,
  notifyOnStatusChange: true,
  notifyOnBlocked: true,
  notifyOnReadyToDeploy: true,
};

export const mockUser = {
  id: "user-1",
  clerkUserId: "test-user-id",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  avatarUrl: null,
};

export const mockService = {
  id: "service-1",
  teamId: "team-1",
  name: "API Service",
  slug: "api-service",
  description: "Main API service",
  repoOwner: "test-org",
  repoName: "api-service",
  repoUrl: "https://github.com/test-org/api-service",
  jiraProjectKey: "API",
  color: "#6366f1",
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockSprint = {
  id: "sprint-1",
  teamId: "team-1",
  name: "Sprint 1",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  status: "ACTIVE",
  goal: "Complete core features",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockRelease = {
  id: "release-1",
  teamId: "team-1",
  serviceId: "service-1",
  sprintId: "sprint-1",
  deploymentGroupId: null,
  ownerId: "user-1",
  title: "v1.0.0 Release",
  description: "Initial release",
  version: "1.0.0",
  status: "IN_DEVELOPMENT",
  statusChangedAt: new Date().toISOString(),
  priority: "MEDIUM",
  isHotfix: false,
  isBlocked: false,
  blockedReason: null,
  targetDate: null,
  stagingDeployedAt: null,
  prodDeployedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  service: {
    id: "service-1",
    name: "API Service",
    color: "#6366f1",
  },
  sprint: {
    id: "sprint-1",
    name: "Sprint 1",
    status: "ACTIVE",
  },
  owner: mockUser,
};

export const mockInvitation = {
  id: "invitation-1",
  teamId: "team-1",
  email: "invite@example.com",
  role: "MEMBER",
  token: "test-token-123",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: null,
  createdAt: new Date().toISOString(),
};

// API Handlers
export const handlers = [
  // Services
  http.get("/api/services", () => {
    return HttpResponse.json([mockService]);
  }),

  http.post("/api/services", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockService,
      ...body,
      id: `service-${Date.now()}`,
    });
  }),

  http.get("/api/services/:id", ({ params }) => {
    return HttpResponse.json({ ...mockService, id: params.id });
  }),

  http.patch("/api/services/:id", async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockService, id: params.id, ...body });
  }),

  http.delete("/api/services/:id", () => {
    return HttpResponse.json({ success: true });
  }),

  // Sprints
  http.get("/api/sprints", () => {
    return HttpResponse.json([mockSprint]);
  }),

  http.post("/api/sprints", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockSprint,
      ...body,
      id: `sprint-${Date.now()}`,
    });
  }),

  // Releases
  http.get("/api/releases", () => {
    return HttpResponse.json([mockRelease]);
  }),

  http.post("/api/releases", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockRelease,
      ...body,
      id: `release-${Date.now()}`,
    });
  }),

  http.get("/api/releases/:id", ({ params }) => {
    return HttpResponse.json({
      ...mockRelease,
      id: params.id,
      items: [],
      dependsOn: [],
      dependents: [],
      activities: [],
      comments: [],
    });
  }),

  http.patch("/api/releases/:id", async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockRelease, id: params.id, ...body });
  }),

  http.delete("/api/releases/:id", () => {
    return HttpResponse.json({ success: true });
  }),

  // Team Settings
  http.get("/api/team/settings", () => {
    return HttpResponse.json({
      ...mockTeam,
      hasSlackWebhook: false,
    });
  }),

  http.patch("/api/team/settings", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockTeam,
      ...body,
      hasSlackWebhook: !!body.slackWebhookUrl,
    });
  }),

  // Invitations
  http.get("/api/team/invitations", () => {
    return HttpResponse.json([mockInvitation]);
  }),

  http.post("/api/team/invitations", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      ...mockInvitation,
      ...body,
      id: `invitation-${Date.now()}`,
      inviteUrl: `http://localhost:3000/invite/test-token-${Date.now()}`,
    });
  }),

  http.delete("/api/team/invitations/:id", () => {
    return HttpResponse.json({ success: true });
  }),

  http.get("/api/invitations/:token", () => {
    // Public endpoint returns masked email and no token for privacy
    return HttpResponse.json({
      id: mockInvitation.id,
      email: "i*****@example.com", // Masked email
      role: mockInvitation.role,
      expiresAt: mockInvitation.expiresAt,
      team: {
        id: "team-1",
        name: "Test Team",
        slug: "test-team",
      },
    });
  }),

  http.post("/api/invitations/:token/accept", () => {
    return HttpResponse.json({
      success: true,
      team: {
        id: "team-1",
        name: "Test Team",
        slug: "test-team",
      },
      role: "MEMBER",
    });
  }),

  // Dashboard
  http.get("/api/dashboard/stats", () => {
    return HttpResponse.json({
      stats: {
        totalReleases: 5,
        releasesInProgress: 3,
        releasesReadyToDeploy: 1,
        blockedReleases: 1,
        deployedThisMonth: 2,
        myReleases: 2,
      },
      activeSprint: { id: "sprint-1", name: "Sprint 1" },
      releasesByStatus: [
        { status: "IN_DEVELOPMENT", count: 2 },
        { status: "IN_REVIEW", count: 1 },
        { status: "READY_STAGING", count: 1 },
      ],
      recentActivities: [],
      upcomingDeployments: [],
    });
  }),

  // Activities
  http.get("/api/releases/:id/activities", () => {
    return HttpResponse.json([]);
  }),

  // Comments
  http.get("/api/releases/:id/comments", () => {
    return HttpResponse.json([]);
  }),

  http.post("/api/releases/:id/comments", async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `comment-${Date.now()}`,
      content: body.content,
      userId: "user-1",
      releaseId: "release-1",
      isEdited: false,
      editedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: mockUser,
    });
  }),
];
