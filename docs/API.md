# API Documentation

This document provides comprehensive API documentation for the Release Monitoring System. All endpoints require authentication via Clerk unless otherwise specified.

## Table of Contents

- [Authentication](#authentication)
- [Releases](#releases)
- [Services](#services)
- [Sprints](#sprints)
- [Release Items](#release-items)
- [Dependencies](#dependencies)
- [Deployment Groups](#deployment-groups)
- [Comments](#comments)
- [Team Settings](#team-settings)
- [Dashboard](#dashboard)
- [Error Handling](#error-handling)

---

## Authentication

All API endpoints require authentication using Clerk. The authentication system validates:
- `orgId` - Organization ID from Clerk
- `userId` - User ID from Clerk

**Authentication Headers:**
```
Authorization: Bearer <clerk_session_token>
```

**Common Error Responses:**
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Team or resource not found

---

## Releases

Endpoints for managing software releases.

### List Releases

Retrieve all releases for the authenticated user's team.

**Endpoint:** `GET /api/releases`

**Authentication:** Required (orgId)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `sprintId` | string | Filter by sprint ID |
| `serviceId` | string | Filter by service ID |
| `status` | string | Filter by single status (see status enum) |
| `statuses` | string | Filter by multiple statuses (comma-separated) |
| `ownerId` | string | Filter by owner user ID |
| `mine` | boolean | Filter to current user's releases (`true`/`false`) |
| `isBlocked` | boolean | Filter by blocked status (`true`/`false`) |

**Status Enum:**
- `PLANNING`
- `IN_DEVELOPMENT`
- `IN_REVIEW`
- `READY_STAGING`
- `IN_STAGING`
- `STAGING_VERIFIED`
- `READY_PRODUCTION`
- `DEPLOYED`
- `CANCELLED`
- `ROLLED_BACK`

**Response:** `200 OK`
```json
[
  {
    "id": "clx1234567890",
    "title": "API v2.0 Release",
    "description": "Major API update with breaking changes",
    "version": "2.0.0",
    "status": "IN_DEVELOPMENT",
    "targetDate": "2024-03-15T00:00:00Z",
    "isBlocked": false,
    "blockedReason": null,
    "teamId": "team123",
    "serviceId": "service123",
    "sprintId": "sprint123",
    "ownerId": "user123",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T15:30:00Z",
    "statusChangedAt": "2024-01-20T15:30:00Z",
    "stagingDeployedAt": null,
    "prodDeployedAt": null,
    "service": {
      "id": "service123",
      "name": "API Service",
      "color": "#3B82F6"
    },
    "sprint": {
      "id": "sprint123",
      "name": "Sprint 24.1",
      "status": "ACTIVE"
    },
    "owner": {
      "id": "user123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "avatarUrl": "https://..."
    },
    "_count": {
      "items": 5,
      "dependsOn": 2,
      "dependents": 1
    }
  }
]
```

**Example:**
```bash
# Get all releases
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/releases

# Get my releases only
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/releases?mine=true"

# Get releases by service and status
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/releases?serviceId=service123&status=IN_DEVELOPMENT"

# Get blocked releases
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/releases?isBlocked=true"
```

---

### Create Release

Create a new release.

**Endpoint:** `POST /api/releases`

**Authentication:** Required (orgId, userId)

**Request Body:**
```json
{
  "title": "API v2.0 Release",
  "description": "Major API update with breaking changes",
  "serviceId": "service123",
  "sprintId": "sprint123",
  "version": "2.0.0",
  "targetDate": "2024-03-15"
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `title` | string | Yes | 1-200 characters |
| `description` | string | No | Max 2000 characters |
| `serviceId` | string | Yes | Valid service ID in team |
| `sprintId` | string | No | Valid sprint ID in team |
| `version` | string | No | Max 50 characters |
| `targetDate` | string | No | ISO 8601 date or YYYY-MM-DD |

**Response:** `201 Created`
```json
{
  "id": "clx1234567890",
  "title": "API v2.0 Release",
  "description": "Major API update with breaking changes",
  "version": "2.0.0",
  "status": "PLANNING",
  "targetDate": "2024-03-15T00:00:00Z",
  "isBlocked": false,
  "teamId": "team123",
  "serviceId": "service123",
  "sprintId": "sprint123",
  "ownerId": "user123",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "service": {
    "id": "service123",
    "name": "API Service",
    "color": "#3B82F6"
  },
  "sprint": {
    "id": "sprint123",
    "name": "Sprint 24.1",
    "status": "ACTIVE"
  },
  "owner": {
    "id": "user123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "avatarUrl": "https://..."
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Service or sprint not found

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API v2.0 Release",
    "description": "Major API update",
    "serviceId": "service123",
    "version": "2.0.0",
    "targetDate": "2024-03-15"
  }' \
  https://api.example.com/api/releases
```

---

### Get Release

Get detailed information about a specific release.

**Endpoint:** `GET /api/releases/:id`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
{
  "id": "clx1234567890",
  "title": "API v2.0 Release",
  "description": "Major API update with breaking changes",
  "version": "2.0.0",
  "status": "IN_DEVELOPMENT",
  "targetDate": "2024-03-15T00:00:00Z",
  "isBlocked": false,
  "blockedReason": null,
  "teamId": "team123",
  "serviceId": "service123",
  "sprintId": "sprint123",
  "ownerId": "user123",
  "service": { },
  "sprint": { },
  "owner": { },
  "items": [
    {
      "id": "item123",
      "type": "JIRA_TICKET",
      "externalId": "PROJ-123",
      "externalUrl": "https://jira.example.com/browse/PROJ-123",
      "title": "Implement new API endpoint",
      "status": "In Progress",
      "assignee": "john@example.com",
      "lastSyncedAt": "2024-01-20T10:00:00Z"
    }
  ],
  "dependsOn": [
    {
      "id": "dep123",
      "blockingRelease": {
        "id": "release456",
        "title": "Database Migration",
        "status": "IN_STAGING",
        "service": {
          "id": "service456",
          "name": "Database Service",
          "color": "#10B981"
        }
      }
    }
  ],
  "dependents": [],
  "activities": [],
  "comments": []
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Release not found or not in team

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/releases/clx1234567890
```

---

### Update Release

Update an existing release.

**Endpoint:** `PATCH /api/releases/:id`

**Authentication:** Required (orgId)

**Request Body:** (All fields optional)
```json
{
  "title": "API v2.0 Release (Updated)",
  "description": "Updated description",
  "version": "2.0.1",
  "status": "IN_REVIEW",
  "targetDate": "2024-03-20",
  "serviceId": "service123",
  "sprintId": "sprint123",
  "isBlocked": true,
  "blockedReason": "Waiting for infrastructure changes"
}
```

**Field Validation:**
| Field | Type | Constraints |
|-------|------|-------------|
| `title` | string | 1-200 characters |
| `description` | string | Max 2000 characters |
| `version` | string | Max 50 characters |
| `status` | string | Valid status from enum |
| `targetDate` | string | ISO 8601 or YYYY-MM-DD |
| `serviceId` | string | Valid service ID |
| `sprintId` | string | Valid sprint ID (nullable) |
| `isBlocked` | boolean | true/false |
| `blockedReason` | string | Max 500 characters (nullable) |

**Response:** `200 OK`
```json
{
  "id": "clx1234567890",
  "title": "API v2.0 Release (Updated)",
  "status": "IN_REVIEW",
  "statusChangedAt": "2024-01-20T16:00:00Z",
  ...
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Release, service, or sprint not found

**Example:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_REVIEW",
    "description": "Ready for code review"
  }' \
  https://api.example.com/api/releases/clx1234567890
```

---

### Delete Release

Delete a release and all associated data.

**Endpoint:** `DELETE /api/releases/:id`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Release not found
- `500 Internal Server Error` - Failed to delete

**Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/releases/clx1234567890
```

---

## Services

Endpoints for managing services (applications/microservices).

### List Services

Get all services for the team.

**Endpoint:** `GET /api/services`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
[
  {
    "id": "service123",
    "name": "API Service",
    "slug": "api-service",
    "description": "Main API service",
    "repoOwner": "myorg",
    "repoName": "api-service",
    "repoUrl": "https://github.com/myorg/api-service",
    "jiraProjectKey": "API",
    "color": "#3B82F6",
    "teamId": "team123",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "_count": {
      "releases": 12
    }
  }
]
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/services
```

---

### Create Service

Create a new service.

**Endpoint:** `POST /api/services`

**Authentication:** Required (orgId)

**Request Body:**
```json
{
  "name": "API Service",
  "description": "Main API service",
  "repoOwner": "myorg",
  "repoName": "api-service",
  "repoUrl": "https://github.com/myorg/api-service",
  "jiraProjectKey": "API",
  "color": "#3B82F6"
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 1-100 characters |
| `description` | string | No | Max 500 characters |
| `repoOwner` | string | No | Max 100 characters |
| `repoName` | string | No | Max 100 characters |
| `repoUrl` | string | No | Valid URL |
| `jiraProjectKey` | string | No | Max 20 characters |
| `color` | string | No | Hex color (#RRGGBB) |

**Response:** `201 Created`
```json
{
  "id": "service123",
  "name": "API Service",
  "slug": "api-service",
  "description": "Main API service",
  "color": "#3B82F6",
  "teamId": "team123",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Team not found

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Service",
    "description": "Main API service",
    "color": "#3B82F6"
  }' \
  https://api.example.com/api/services
```

---

### Update Service

Update an existing service.

**Endpoint:** `PATCH /api/services/:id`

**Authentication:** Required (orgId)

**Request Body:** (All fields optional)
```json
{
  "name": "API Service v2",
  "description": "Updated description",
  "color": "#10B981"
}
```

**Response:** `200 OK`
```json
{
  "id": "service123",
  "name": "API Service v2",
  "slug": "api-service",
  "description": "Updated description",
  "color": "#10B981",
  ...
}
```

**Example:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}' \
  https://api.example.com/api/services/service123
```

---

### Delete Service

Delete a service.

**Endpoint:** `DELETE /api/services/:id`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/services/service123
```

---

## Sprints

Endpoints for managing sprints.

### List Sprints

Get all sprints for the team.

**Endpoint:** `GET /api/sprints`

**Authentication:** Required (orgId)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `PLANNING`, `ACTIVE`, `COMPLETED`, `CANCELLED` |

**Response:** `200 OK`
```json
[
  {
    "id": "sprint123",
    "name": "Sprint 24.1",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-14T00:00:00Z",
    "goal": "Complete API v2.0",
    "status": "ACTIVE",
    "teamId": "team123",
    "createdAt": "2023-12-20T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "_count": {
      "releases": 8
    }
  }
]
```

**Example:**
```bash
# Get all sprints
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/sprints

# Get active sprints only
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/sprints?status=ACTIVE"
```

---

### Create Sprint

Create a new sprint.

**Endpoint:** `POST /api/sprints`

**Authentication:** Required (orgId)

**Request Body:**
```json
{
  "name": "Sprint 24.2",
  "startDate": "2024-01-15",
  "endDate": "2024-01-28",
  "goal": "Complete infrastructure updates"
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 1-100 characters |
| `startDate` | string | Yes | ISO 8601 or YYYY-MM-DD |
| `endDate` | string | Yes | ISO 8601 or YYYY-MM-DD, must be after startDate |
| `goal` | string | No | Max 500 characters |

**Response:** `201 Created`
```json
{
  "id": "sprint456",
  "name": "Sprint 24.2",
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-01-28T00:00:00Z",
  "goal": "Complete infrastructure updates",
  "status": "PLANNING",
  "teamId": "team123",
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2024-01-10T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed or endDate before startDate
- `401 Unauthorized` - Not authenticated

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sprint 24.2",
    "startDate": "2024-01-15",
    "endDate": "2024-01-28",
    "goal": "Infrastructure updates"
  }' \
  https://api.example.com/api/sprints
```

---

### Update Sprint

Update an existing sprint.

**Endpoint:** `PATCH /api/sprints/:id`

**Authentication:** Required (orgId)

**Request Body:** (All fields optional)
```json
{
  "name": "Sprint 24.2 (Extended)",
  "endDate": "2024-02-01",
  "status": "ACTIVE"
}
```

**Response:** `200 OK`

**Example:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "ACTIVE"}' \
  https://api.example.com/api/sprints/sprint456
```

---

### Delete Sprint

Delete a sprint.

**Endpoint:** `DELETE /api/sprints/:id`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/sprints/sprint456
```

---

## Release Items

Endpoints for managing Jira tickets and GitHub PRs linked to releases.

### List Release Items

Get all items (Jira tickets, GitHub PRs) for a release.

**Endpoint:** `GET /api/releases/:id/items`

**Authentication:** Required (userId, orgId)

**Response:** `200 OK`
```json
[
  {
    "id": "item123",
    "releaseId": "release123",
    "type": "JIRA_TICKET",
    "externalId": "PROJ-123",
    "externalUrl": "https://jira.example.com/browse/PROJ-123",
    "title": "Implement new API endpoint",
    "status": "In Progress",
    "assignee": "john@example.com",
    "lastSyncedAt": "2024-01-20T10:00:00Z",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T10:00:00Z"
  },
  {
    "id": "item124",
    "releaseId": "release123",
    "type": "GITHUB_PR",
    "externalId": "42",
    "externalUrl": "https://github.com/myorg/repo/pull/42",
    "title": "Add new endpoint",
    "status": "open",
    "assignee": "jane",
    "lastSyncedAt": "2024-01-20T11:00:00Z",
    "createdAt": "2024-01-16T14:00:00Z",
    "updatedAt": "2024-01-20T11:00:00Z"
  }
]
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/releases/release123/items
```

---

### Add Release Item

Link a Jira ticket or GitHub PR to a release.

**Endpoint:** `POST /api/releases/:id/items`

**Authentication:** Required (userId, orgId)

**Request Body:**
```json
{
  "type": "JIRA_TICKET",
  "externalId": "PROJ-123",
  "externalUrl": "https://jira.example.com/browse/PROJ-123",
  "title": "Implement new API endpoint",
  "status": "In Progress",
  "assignee": "john@example.com"
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `type` | string | Yes | `JIRA_TICKET` or `GITHUB_PR` |
| `externalId` | string | Yes | Min 1 character |
| `externalUrl` | string | No | Valid URL |
| `title` | string | No | Any string |
| `status` | string | No | Any string |
| `assignee` | string | No | Any string |

**Response:** `201 Created`
```json
{
  "id": "item123",
  "releaseId": "release123",
  "type": "JIRA_TICKET",
  "externalId": "PROJ-123",
  "externalUrl": "https://jira.example.com/browse/PROJ-123",
  "title": "Implement new API endpoint",
  "status": "In Progress",
  "assignee": "john@example.com",
  "lastSyncedAt": "2024-01-20T10:00:00Z",
  "createdAt": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Release not found
- `409 Conflict` - Item already linked to this release

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "JIRA_TICKET",
    "externalId": "PROJ-123",
    "externalUrl": "https://jira.example.com/browse/PROJ-123",
    "title": "Implement new API endpoint"
  }' \
  https://api.example.com/api/releases/release123/items
```

---

### Remove Release Item

Unlink an item from a release.

**Endpoint:** `DELETE /api/releases/:id/items?itemId=:itemId`

**Authentication:** Required (userId, orgId)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `itemId` | string | Yes | ID of the item to remove |

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Error Responses:**
- `400 Bad Request` - itemId not provided
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Release or item not found

**Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/releases/release123/items?itemId=item123"
```

---

## Dependencies

Endpoints for managing release dependencies.

### List Dependencies

Get all dependencies for a release (both upstream and downstream).

**Endpoint:** `GET /api/releases/:id/dependencies`

**Authentication:** Required (userId, orgId)

**Response:** `200 OK`
```json
{
  "dependsOn": [
    {
      "id": "dep123",
      "type": "BLOCKS",
      "description": "Requires database migration",
      "isResolved": false,
      "resolvedAt": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "release": {
        "id": "release456",
        "title": "Database Migration v2",
        "version": "2.0.0",
        "status": "IN_STAGING",
        "service": {
          "name": "Database Service",
          "color": "#10B981"
        }
      }
    }
  ],
  "dependents": [
    {
      "id": "dep456",
      "type": "BLOCKS",
      "description": "Frontend needs this API",
      "isResolved": false,
      "resolvedAt": null,
      "createdAt": "2024-01-16T14:00:00Z",
      "release": {
        "id": "release789",
        "title": "Frontend Update",
        "version": "1.5.0",
        "status": "PLANNING",
        "service": {
          "name": "Frontend",
          "color": "#F59E0B"
        }
      }
    }
  ]
}
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/releases/release123/dependencies
```

---

### Add Dependency

Create a dependency relationship between two releases.

**Endpoint:** `POST /api/releases/:id/dependencies`

**Authentication:** Required (userId, orgId)

**Request Body:**
```json
{
  "blockingReleaseId": "release456",
  "type": "BLOCKS",
  "description": "Requires database migration to be deployed first"
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `blockingReleaseId` | string | Yes | Valid release ID in team |
| `type` | string | No | Default: `BLOCKS` |
| `description` | string | No | Any string |

**Response:** `201 Created`
```json
{
  "id": "dep123",
  "type": "BLOCKS",
  "description": "Requires database migration to be deployed first",
  "isResolved": false,
  "createdAt": "2024-01-20T10:00:00Z",
  "release": {
    "id": "release456",
    "title": "Database Migration v2",
    "version": "2.0.0",
    "status": "IN_STAGING",
    "service": {
      "name": "Database Service",
      "color": "#10B981"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed, self-dependency, or circular dependency detected
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Release not found
- `409 Conflict` - Dependency already exists

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blockingReleaseId": "release456",
    "description": "Requires database migration"
  }' \
  https://api.example.com/api/releases/release123/dependencies
```

---

### Remove Dependency

Delete a dependency relationship.

**Endpoint:** `DELETE /api/releases/:id/dependencies/:depId`

**Authentication:** Required (userId, orgId)

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/releases/release123/dependencies/dep123
```

---

## Deployment Groups

Endpoints for managing deployment groups (coordinated deployments of multiple releases).

### List Deployment Groups

Get all deployment groups for the team.

**Endpoint:** `GET /api/deployment-groups`

**Authentication:** Required (orgId)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `sprintId` | string | Filter by sprint ID |
| `status` | string | Filter by status: `PENDING`, `READY`, `DEPLOYING`, `DEPLOYED`, `CANCELLED` |

**Response:** `200 OK`
```json
[
  {
    "id": "group123",
    "name": "Sprint 24.1 Deployment",
    "description": "Coordinated deployment of all Sprint 24.1 releases",
    "deployOrder": "SEQUENTIAL",
    "targetDate": "2024-01-28T00:00:00Z",
    "status": "READY",
    "notifyOnReady": true,
    "teamId": "team123",
    "sprintId": "sprint123",
    "ownerId": "user123",
    "deployedAt": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T15:00:00Z",
    "sprint": {
      "id": "sprint123",
      "name": "Sprint 24.1",
      "status": "ACTIVE"
    },
    "owner": {
      "id": "user123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "avatarUrl": "https://..."
    },
    "releases": [
      {
        "id": "release123",
        "title": "API v2.0",
        "status": "READY_STAGING",
        "service": {
          "id": "service123",
          "name": "API Service",
          "color": "#3B82F6"
        }
      }
    ],
    "_count": {
      "releases": 3
    }
  }
]
```

**Example:**
```bash
# Get all deployment groups
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/deployment-groups

# Get deployment groups for a sprint
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/deployment-groups?sprintId=sprint123"

# Get ready deployment groups
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/deployment-groups?status=READY"
```

---

### Create Deployment Group

Create a new deployment group.

**Endpoint:** `POST /api/deployment-groups`

**Authentication:** Required (orgId, userId)

**Request Body:**
```json
{
  "name": "Sprint 24.1 Deployment",
  "description": "Coordinated deployment of all Sprint 24.1 releases",
  "sprintId": "sprint123",
  "deployOrder": "SEQUENTIAL",
  "targetDate": "2024-01-28",
  "notifyOnReady": true
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 1-200 characters |
| `description` | string | No | Max 1000 characters |
| `sprintId` | string | No | Valid sprint ID |
| `deployOrder` | string | No | `SEQUENTIAL` or `PARALLEL`, default: `SEQUENTIAL` |
| `targetDate` | string | No | ISO 8601 or YYYY-MM-DD |
| `notifyOnReady` | boolean | No | Default: true |

**Response:** `201 Created`
```json
{
  "id": "group123",
  "name": "Sprint 24.1 Deployment",
  "description": "Coordinated deployment of all Sprint 24.1 releases",
  "deployOrder": "SEQUENTIAL",
  "targetDate": "2024-01-28T00:00:00Z",
  "status": "PENDING",
  "notifyOnReady": true,
  "teamId": "team123",
  "sprintId": "sprint123",
  "ownerId": "user123",
  "createdAt": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z",
  "sprint": { },
  "owner": { },
  "_count": {
    "releases": 0
  }
}
```

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sprint 24.1 Deployment",
    "description": "Coordinated deployment",
    "sprintId": "sprint123",
    "targetDate": "2024-01-28"
  }' \
  https://api.example.com/api/deployment-groups
```

---

### Update Deployment Group

Update an existing deployment group.

**Endpoint:** `PATCH /api/deployment-groups/:id`

**Authentication:** Required (orgId)

**Request Body:** (All fields optional)
```json
{
  "name": "Sprint 24.1 Deployment (Updated)",
  "status": "READY",
  "targetDate": "2024-02-01"
}
```

**Response:** `200 OK`

**Example:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "READY"}' \
  https://api.example.com/api/deployment-groups/group123
```

---

### Delete Deployment Group

Delete a deployment group (releases are not deleted).

**Endpoint:** `DELETE /api/deployment-groups/:id`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/deployment-groups/group123
```

---

### Get Deployment Group Releases

Get all releases in a deployment group.

**Endpoint:** `GET /api/deployment-groups/:id/releases`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
[
  {
    "id": "release123",
    "title": "API v2.0",
    "status": "READY_STAGING",
    "deploymentGroupId": "group123",
    "service": {
      "id": "service123",
      "name": "API Service",
      "color": "#3B82F6"
    }
  }
]
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/deployment-groups/group123/releases
```

---

## Comments

Endpoints for managing comments on releases.

### List Comments

Get all comments for a release.

**Endpoint:** `GET /api/releases/:id/comments`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
[
  {
    "id": "comment123",
    "releaseId": "release123",
    "userId": "user123",
    "content": "Ready for code review",
    "createdAt": "2024-01-20T10:00:00Z",
    "updatedAt": "2024-01-20T10:00:00Z",
    "user": {
      "id": "user123",
      "clerkUserId": "clerk_user123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "avatarUrl": "https://..."
    }
  }
]
```

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/releases/release123/comments
```

---

### Add Comment

Add a comment to a release.

**Endpoint:** `POST /api/releases/:id/comments`

**Authentication:** Required (userId, orgId)

**Request Body:**
```json
{
  "content": "Ready for code review"
}
```

**Field Validation:**
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `content` | string | Yes | 1-10000 characters |

**Response:** `201 Created`
```json
{
  "id": "comment123",
  "releaseId": "release123",
  "userId": "user123",
  "content": "Ready for code review",
  "createdAt": "2024-01-20T10:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z",
  "user": {
    "id": "user123",
    "clerkUserId": "clerk_user123",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "avatarUrl": "https://..."
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Release or user not found

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Ready for code review"}' \
  https://api.example.com/api/releases/release123/comments
```

---

### Update Comment

Update an existing comment.

**Endpoint:** `PATCH /api/releases/:id/comments/:commentId`

**Authentication:** Required (userId, orgId)

**Request Body:**
```json
{
  "content": "Updated comment text"
}
```

**Response:** `200 OK`

**Example:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated comment"}' \
  https://api.example.com/api/releases/release123/comments/comment123
```

---

### Delete Comment

Delete a comment.

**Endpoint:** `DELETE /api/releases/:id/comments/:commentId`

**Authentication:** Required (userId, orgId)

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/releases/release123/comments/comment123
```

---

## Team Settings

Endpoints for managing team settings and integrations.

### Get Team Settings

Get current team settings.

**Endpoint:** `GET /api/team/settings`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
{
  "id": "team123",
  "name": "Engineering Team",
  "slug": "engineering-team",
  "slackWebhookUrl": "****webhook",
  "hasSlackWebhook": true,
  "slackChannel": "#releases",
  "notifyOnStatusChange": true,
  "notifyOnBlocked": true,
  "notifyOnReadyToDeploy": true
}
```

**Note:** The `slackWebhookUrl` is masked for security, showing only the last 8 characters.

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/team/settings
```

---

### Update Team Settings

Update team settings. Requires OWNER or ADMIN role.

**Endpoint:** `PATCH /api/team/settings`

**Authentication:** Required (orgId, userId)

**Permissions:** OWNER or ADMIN role required

**Request Body:** (All fields optional)
```json
{
  "slackWebhookUrl": "https://hooks.slack.com/services/...",
  "slackChannel": "#releases",
  "notifyOnStatusChange": true,
  "notifyOnBlocked": true,
  "notifyOnReadyToDeploy": true
}
```

**Field Validation:**
| Field | Type | Constraints |
|-------|------|-------------|
| `slackWebhookUrl` | string | Must be https://hooks.slack.com URL (nullable) |
| `slackChannel` | string | Max 100 characters (nullable) |
| `notifyOnStatusChange` | boolean | true/false |
| `notifyOnBlocked` | boolean | true/false |
| `notifyOnReadyToDeploy` | boolean | true/false |

**Response:** `200 OK`
```json
{
  "id": "team123",
  "name": "Engineering Team",
  "slug": "engineering-team",
  "slackWebhookUrl": "****webhook",
  "hasSlackWebhook": true,
  "slackChannel": "#releases",
  "notifyOnStatusChange": true,
  "notifyOnBlocked": true,
  "notifyOnReadyToDeploy": true
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed (invalid Slack webhook URL)
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User doesn't have OWNER or ADMIN role
- `404 Not Found` - Team or user not found

**Example:**
```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slackWebhookUrl": "https://hooks.slack.com/services/...",
    "slackChannel": "#releases",
    "notifyOnStatusChange": true
  }' \
  https://api.example.com/api/team/settings
```

---

### Test Slack Integration

Test the Slack webhook configuration.

**Endpoint:** `POST /api/team/settings/test-slack`

**Authentication:** Required (orgId, userId)

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Test notification sent successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Slack webhook not configured
- `500 Internal Server Error` - Failed to send test notification

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/team/settings/test-slack
```

---

## Dashboard

Endpoints for dashboard statistics and analytics.

### Get Dashboard Stats

Get comprehensive dashboard statistics for the team.

**Endpoint:** `GET /api/dashboard/stats`

**Authentication:** Required (orgId)

**Response:** `200 OK`
```json
{
  "stats": {
    "totalReleases": 24,
    "releasesInProgress": 8,
    "releasesReadyToDeploy": 3,
    "blockedReleases": 2,
    "deployedThisMonth": 12,
    "myReleases": 5
  },
  "activeSprint": {
    "id": "sprint123",
    "name": "Sprint 24.1"
  },
  "releasesByStatus": [
    { "status": "PLANNING", "count": 5 },
    { "status": "IN_DEVELOPMENT", "count": 6 },
    { "status": "IN_REVIEW", "count": 2 },
    { "status": "READY_STAGING", "count": 3 },
    { "status": "IN_STAGING", "count": 4 },
    { "status": "READY_PRODUCTION", "count": 4 }
  ],
  "recentActivities": [
    {
      "id": "activity123",
      "type": "STATUS_CHANGED",
      "action": "changed status",
      "description": "Changed status from IN_DEVELOPMENT to IN_REVIEW",
      "createdAt": "2024-01-20T15:30:00Z",
      "user": {
        "id": "user123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "avatarUrl": "https://..."
      },
      "release": {
        "id": "release123",
        "title": "API v2.0",
        "service": {
          "name": "API Service",
          "color": "#3B82F6"
        }
      }
    }
  ],
  "upcomingDeployments": [
    {
      "id": "release123",
      "title": "API v2.0",
      "version": "2.0.0",
      "status": "READY_STAGING",
      "statusChangedAt": "2024-01-20T10:00:00Z",
      "service": {
        "name": "API Service",
        "color": "#3B82F6"
      },
      "owner": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "avatarUrl": "https://..."
      }
    }
  ]
}
```

**Description:**
- `totalReleases` - Count of non-completed releases (excludes DEPLOYED, CANCELLED, ROLLED_BACK)
- `releasesInProgress` - Releases in IN_DEVELOPMENT, IN_REVIEW, or IN_STAGING status
- `releasesReadyToDeploy` - Releases in READY_STAGING, STAGING_VERIFIED, or READY_PRODUCTION status
- `blockedReleases` - Non-completed releases with isBlocked=true
- `deployedThisMonth` - Releases deployed to production this calendar month
- `myReleases` - Non-completed releases owned by current user
- `activeSprint` - Currently active sprint (if any)
- `releasesByStatus` - Distribution of releases by status
- `recentActivities` - Last 10 activities across all releases
- `upcomingDeployments` - Up to 5 releases ready for deployment (oldest first)

**Example:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/dashboard/stats
```

---

## Error Handling

The API uses standard HTTP status codes and returns errors in JSON format.

### Status Codes

| Status Code | Description |
|-------------|-------------|
| `200 OK` | Request succeeded |
| `201 Created` | Resource created successfully |
| `400 Bad Request` | Invalid request data or validation error |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Resource conflict (duplicate, circular dependency, etc.) |
| `500 Internal Server Error` | Server error |

### Error Response Format

```json
{
  "error": "Human-readable error message"
}
```

**With Validation Details:**
```json
{
  "error": "Validation failed",
  "details": {
    "fieldErrors": {
      "title": ["Title is required"],
      "version": ["Version must be 50 characters or less"]
    }
  }
}
```

### Common Error Scenarios

**Unauthorized Access:**
```json
{
  "error": "Unauthorized"
}
```

**Team Not Found:**
```json
{
  "error": "Team not found"
}
```

**Resource Not Found:**
```json
{
  "error": "Release not found"
}
```

**Validation Error:**
```json
{
  "error": "Validation failed",
  "details": { }
}
```

**Circular Dependency:**
```json
{
  "error": "This would create a circular dependency"
}
```

**Duplicate Resource:**
```json
{
  "error": "Item already linked to this release"
}
```

---

## Rate Limiting

Currently, there are no explicit rate limits enforced by the API. However, it's recommended to:
- Implement client-side throttling for bulk operations
- Use appropriate caching strategies
- Avoid excessive polling (use webhooks or Slack notifications instead)
- Limit concurrent requests to 10 per user
- Add exponential backoff for retries (start with 1 second, max 30 seconds)

---

## Network & Integration Error Handling

### Network Timeouts

API requests may timeout under heavy load or network issues:

**Default Timeouts:**
- Standard API requests: 30 seconds
- Integration searches (Jira/GitHub): 15 seconds

**Handling Timeouts:**
```javascript
// Recommended client-side timeout handling
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch('/api/releases', {
    signal: controller.signal,
    // ... other options
  });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    // Handle timeout - retry with exponential backoff
  }
}
```

### Token Refresh Failures

OAuth tokens (Jira, GitHub) may expire or become invalid:

**Automatic Refresh:**
- Jira tokens are automatically refreshed when expired
- GitHub tokens do not expire but may be revoked

**Error Response (Token Invalid):**
```json
{
  "error": "Integration connection is invalid. Please reconnect.",
  "code": "OAUTH_INVALID"
}
```

**Error Response (Refresh Failed):**
```json
{
  "error": "Failed to refresh token. Please reconnect your integration.",
  "code": "OAUTH_REFRESH_FAILED"
}
```

**Recommended Handling:**
1. Catch `OAUTH_INVALID` or `OAUTH_REFRESH_FAILED` errors
2. Prompt user to reconnect integration at `/settings/integrations`
3. Retry the operation after reconnection

### External Service Errors

When Jira or GitHub APIs fail:

**Error Response:**
```json
{
  "error": "Failed to search Jira issues",
  "details": "External service temporarily unavailable"
}
```

**Best Practices:**
- Implement retry logic with exponential backoff
- Show user-friendly messages for external failures
- Cache successful responses when appropriate
- Monitor for repeated failures and alert users

---

## Webhooks and Notifications

The system supports Slack notifications for key events. Configure via the Team Settings endpoint:
- Status changes
- Blocked releases
- Releases ready to deploy

Notifications are sent asynchronously and do not block API responses.

---

## Data Model Relationships

```
Team
├── Services
├── Sprints
├── Releases
│   ├── Items (Jira Tickets, GitHub PRs)
│   ├── Comments
│   ├── Activities
│   ├── Dependencies (blocking/blocked by other releases)
│   └── Deployment Group membership
├── Deployment Groups
└── Team Settings
```

---

## Best Practices

1. **Authentication**: Always include valid Clerk session tokens
2. **Error Handling**: Handle all error status codes appropriately
3. **Filtering**: Use query parameters to filter large result sets
4. **Dependencies**: Check for circular dependencies before creating
5. **Status Updates**: Use PATCH endpoints to update release status
6. **Pagination**: Currently not implemented; consider client-side pagination for large datasets
7. **Real-time Updates**: Consider implementing WebSocket connections for live updates
8. **Idempotency**: POST requests are not idempotent; handle duplicates appropriately

---

## Support

For API support or to report issues:
- Check the error response for detailed information
- Review validation schemas in `/src/lib/validations/`
- Consult activity logs for audit trails
- Use Slack notifications for real-time monitoring
