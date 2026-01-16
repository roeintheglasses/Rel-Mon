# Development Guide

This guide provides comprehensive information for developers working on Release Coordinator. It covers project structure, development workflow, coding conventions, and contribution guidelines.

## 📁 Project Structure

### High-Level Overview

```
release-coordinator/
├── src/                      # Application source code
│   ├── app/                 # Next.js App Router pages and API routes
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities, helpers, and validations
│   ├── services/            # Business logic and external integrations
│   └── test/                # Test setup and utilities
├── prisma/                   # Database schema and migrations
├── docs/                     # Documentation
└── public/                   # Static assets
```

### Detailed Structure

#### `src/app/` - Next.js App Router

The app directory uses Next.js 16's App Router with the following structure:

```
src/app/
├── (auth)/                          # Authentication route group
│   ├── layout.tsx                   # Auth-specific layout
│   ├── sign-in/[[...sign-in]]/     # Clerk sign-in page
│   └── sign-up/[[...sign-up]]/     # Clerk sign-up page
├── (dashboard)/                     # Main application route group
│   ├── layout.tsx                   # Dashboard layout with sidebar/header
│   ├── page.tsx                     # Dashboard home
│   ├── board/                       # Kanban board view
│   ├── releases/                    # Release management pages
│   ├── services/                    # Service management
│   ├── sprints/                     # Sprint management
│   ├── deployment-groups/           # Deployment group management
│   ├── settings/                    # Team settings
│   ├── error.tsx                    # Error boundary
│   └── loading.tsx                  # Loading state
├── api/                             # API routes
│   ├── releases/                    # Release CRUD operations
│   ├── services/                    # Service management
│   ├── sprints/                     # Sprint management
│   ├── oauth/                       # OAuth flows (GitHub, Jira)
│   ├── webhooks/                    # Webhook handlers (Clerk)
│   └── ...                          # Other API endpoints
├── invite/[token]/                  # Team invitation acceptance
├── select-org/                      # Organization selection page
├── layout.tsx                       # Root layout
├── page.tsx                         # Landing page
└── globals.css                      # Global styles
```

**Route Groups:**
- `(auth)` - Authentication pages with minimal layout
- `(dashboard)` - Main application with full dashboard layout

**API Route Patterns:**
- `GET /api/resources` - List all resources
- `POST /api/resources` - Create resource
- `GET /api/resources/:id` - Get single resource
- `PATCH /api/resources/:id` - Update resource
- `DELETE /api/resources/:id` - Delete resource

#### `src/components/` - React Components

```
src/components/
├── ui/                      # shadcn/ui primitive components
│   ├── button.tsx          # Button component
│   ├── dialog.tsx          # Modal/dialog
│   ├── card.tsx            # Card container
│   ├── input.tsx           # Form input
│   └── ...                 # Other UI primitives
├── layout/                  # Layout components
│   ├── header.tsx          # Dashboard header
│   └── sidebar.tsx         # Dashboard sidebar
├── board/                   # Kanban board components
│   ├── kanban-board.tsx    # Main board container
│   ├── kanban-column.tsx   # Board column
│   └── release-card.tsx    # Release card
├── releases/                # Release-specific components
│   ├── activity-timeline.tsx
│   └── comments-section.tsx
├── providers/               # Context providers
│   └── query-provider.tsx  # React Query provider
├── error-boundary.tsx       # Error boundary component
└── page-loading.tsx         # Loading skeleton
```

**Component Categories:**
- **UI Components** (`ui/`) - Reusable, unstyled primitives from Radix UI
- **Layout Components** (`layout/`) - Application shell and navigation
- **Feature Components** - Domain-specific components organized by feature
- **Providers** - React context providers for global state

#### `src/hooks/` - Custom React Hooks

```
src/hooks/
├── use-releases.ts          # Release data fetching and mutations
├── use-services.ts          # Service management
├── use-sprints.ts           # Sprint management
├── use-dashboard.ts         # Dashboard stats
├── use-activities.ts        # Activity timeline
├── use-comments.ts          # Comments/discussions
└── __tests__/               # Hook tests
    ├── use-releases.test.tsx
    └── ...
```

**Hook Pattern:**
All hooks follow the React Query pattern with:
- `useFoos()` - Query hook for listing resources
- `useFoo(id)` - Query hook for single resource
- `useCreateFoo()` - Mutation hook for creating
- `useUpdateFoo()` - Mutation hook for updating
- `useDeleteFoo()` - Mutation hook for deleting

#### `src/lib/` - Utilities and Helpers

```
src/lib/
├── validations/             # Zod schemas
│   ├── release.ts          # Release validation schemas
│   ├── service.ts          # Service schemas
│   ├── sprint.ts           # Sprint schemas
│   └── __tests__/          # Schema tests
├── constants/               # Application constants
│   └── release.ts          # Release status/priority constants
├── prisma.ts               # Prisma client singleton
├── auth.ts                 # Authentication utilities
├── encryption.ts           # Token encryption/decryption
└── utils.ts                # General utilities (cn, etc.)
```

**Key Files:**
- `validations/` - Zod schemas for runtime type validation
- `prisma.ts` - Singleton Prisma client instance
- `utils.ts` - Contains `cn()` for merging Tailwind classes

#### `src/services/` - Business Logic

```
src/services/
├── activity-logger.ts       # Activity tracking service
├── blocked-status.ts        # Blocked status logic
├── notification-service.ts  # Notification orchestration
├── github-client.ts         # GitHub API integration
├── jira-client.ts           # Jira API integration
├── slack-client.ts          # Slack webhook integration
└── __tests__/               # Service tests
    └── slack-client.test.ts
```

**Service Pattern:**
Services encapsulate business logic and external integrations:
- Pure functions when possible
- Async operations for external APIs
- Error handling with try/catch
- Type-safe with TypeScript

## 🎨 Coding Conventions

### TypeScript Guidelines

#### Strict Typing
```typescript
// ✅ Good - Explicit types
interface Release {
  id: string;
  title: string;
  status: ReleaseStatus;
}

function updateRelease(id: string, data: UpdateReleaseInput): Promise<Release> {
  // ...
}

// ❌ Bad - Using 'any'
function updateRelease(id: any, data: any): any {
  // ...
}
```

#### Use Type Inference
```typescript
// ✅ Good - Let TypeScript infer
const releases = await fetchReleases();
const releaseIds = releases.map(r => r.id);

// ❌ Bad - Over-specifying
const releases: Release[] = await fetchReleases();
const releaseIds: string[] = releases.map((r: Release): string => r.id);
```

#### Zod for Runtime Validation
```typescript
// Define schema
export const createReleaseSchema = z.object({
  title: z.string().min(1),
  serviceId: z.string(),
  sprintId: z.string().optional(),
  targetDate: z.string().optional(),
});

// Infer TypeScript type
export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;

// Use in API routes
const body = await request.json();
const validatedData = createReleaseSchema.parse(body); // Throws if invalid
```

### React Component Patterns

#### Functional Components with TypeScript
```typescript
interface KanbanBoardProps {
  releases: Release[];
  isLoading?: boolean;
}

export function KanbanBoard({ releases, isLoading = false }: KanbanBoardProps) {
  // Component logic
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

#### Client vs Server Components
```typescript
// Server Component (default in App Router)
// - No "use client" directive
// - Can use async/await directly
// - Can access server-only APIs
export default async function ReleasePage({ params }: { params: { id: string } }) {
  const release = await fetchRelease(params.id);
  return <ReleaseView release={release} />;
}

// Client Component
// - Has "use client" directive
// - Can use React hooks
// - Can have interactivity
"use client";

import { useState } from "react";

export function ReleaseCard({ release }: { release: Release }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // ...
}
```

#### State Management
```typescript
// Local state with useState
const [isOpen, setIsOpen] = useState(false);

// Server state with React Query
const { data: releases, isLoading, error } = useReleases();

// Mutations
const updateRelease = useUpdateRelease();
await updateRelease.mutateAsync({ id, data });

// Optimistic updates
const queryClient = useQueryClient();
queryClient.setQueryData(["releases"], (old) => {
  // Update cache optimistically
});
```

#### Component Organization
```typescript
"use client";

// 1. Imports
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useReleases } from "@/hooks/use-releases";

// 2. Type definitions
interface Props {
  releaseId: string;
}

// 3. Component
export function ReleaseActions({ releaseId }: Props) {
  // 3a. Hooks
  const { data: release } = useRelease(releaseId);
  const [isDeleting, setIsDeleting] = useState(false);

  // 3b. Computed values
  const canDelete = useMemo(() => {
    return release?.status === "PLANNING";
  }, [release]);

  // 3c. Event handlers
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteRelease(releaseId);
    } finally {
      setIsDeleting(false);
    }
  };

  // 3d. Render
  return (
    <Button onClick={handleDelete} disabled={!canDelete || isDeleting}>
      Delete
    </Button>
  );
}
```

### API Route Patterns

#### Standard CRUD Pattern
```typescript
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createResourceSchema } from "@/lib/validations/resource";

// GET /api/resources - List all
export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth();

    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get team from orgId
    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter");

    // Fetch resources
    const resources = await prisma.resource.findMany({
      where: {
        teamId: team.id,
        ...(filter ? { status: filter } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error("Error fetching resources:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

// POST /api/resources - Create
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const validatedData = createResourceSchema.parse(body);

    // Create resource
    const resource = await prisma.resource.create({
      data: {
        ...validatedData,
        teamId: team.id,
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error("Error creating resource:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}
```

#### Dynamic Route Pattern
```typescript
// File: src/app/api/releases/[id]/route.ts

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  // Fetch by id
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  // Update by id
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  // Delete by id
}
```

#### Error Handling
```typescript
// Consistent error responses
return NextResponse.json(
  { error: "Human-readable error message" },
  { status: 400 } // Appropriate status code
);

// Status codes:
// 200 - Success (GET, PATCH, PUT)
// 201 - Created (POST)
// 204 - No Content (DELETE)
// 400 - Bad Request (validation errors)
// 401 - Unauthorized (not authenticated)
// 403 - Forbidden (not authorized for this resource)
// 404 - Not Found
// 500 - Internal Server Error
```

### Service Pattern

```typescript
// src/services/example-service.ts

/**
 * Service for managing external API integration
 */
export class ExampleService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetches data from external API
   */
  async fetchData(params: FetchParams): Promise<Data> {
    try {
      const response = await fetch(`${this.baseUrl}/endpoint`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
}

// Helper function exports for common operations
export async function doSomething(params: Params): Promise<Result> {
  try {
    // Business logic
    return result;
  } catch (error) {
    console.error("Error in doSomething:", error);
    throw error;
  }
}
```

### Database Patterns (Prisma)

#### Queries
```typescript
// Find unique
const release = await prisma.release.findUnique({
  where: { id: releaseId },
  include: {
    service: true,
    owner: true,
  },
});

// Find many with filters
const releases = await prisma.release.findMany({
  where: {
    teamId: team.id,
    status: { in: ["READY_STAGING", "READY_PRODUCTION"] },
  },
  orderBy: { updatedAt: "desc" },
  take: 10,
});

// Find first (or null)
const team = await prisma.team.findFirst({
  where: { clerkOrgId: orgId },
});
```

#### Mutations
```typescript
// Create
const release = await prisma.release.create({
  data: {
    title: "New Release",
    teamId: team.id,
    serviceId: service.id,
    ownerId: user.id,
    status: "PLANNING",
  },
});

// Update
const updated = await prisma.release.update({
  where: { id: releaseId },
  data: { status: "IN_REVIEW" },
});

// Delete
await prisma.release.delete({
  where: { id: releaseId },
});

// Upsert (create or update)
const service = await prisma.service.upsert({
  where: { name: "api-service" },
  update: { color: "#FF0000" },
  create: { name: "api-service", color: "#FF0000", teamId: team.id },
});
```

#### Transactions
```typescript
// Use for operations that must succeed or fail together
await prisma.$transaction(async (tx) => {
  // Update release status
  await tx.release.update({
    where: { id: releaseId },
    data: { status: "DEPLOYED" },
  });

  // Log activity
  await tx.activity.create({
    data: {
      teamId: team.id,
      releaseId: releaseId,
      type: "STATUS_CHANGED",
      action: "deployed",
      description: "Release deployed to production",
    },
  });
});
```

### Styling with Tailwind

#### Class Composition
```typescript
// Use cn() utility for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "rounded-lg border p-4",
  isActive && "bg-primary text-white",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />
```

#### Component Variants
```typescript
// Use cva (class-variance-authority) for component variants
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4",
        lg: "h-11 px-8 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

export function Button({ variant, size, children }: ButtonProps) {
  return (
    <button className={buttonVariants({ variant, size })}>
      {children}
    </button>
  );
}
```

## 🧪 Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("ComponentName", () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it("should render correctly", () => {
    render(<ComponentName />);
    expect(screen.getByText("Expected text")).toBeInTheDocument();
  });

  it("should handle user interaction", async () => {
    const user = userEvent.setup();
    render(<ComponentName />);

    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(screen.getByText("Clicked")).toBeInTheDocument();
  });

  it("should handle async operations", async () => {
    render(<ComponentName />);

    await waitFor(() => {
      expect(screen.getByText("Loaded data")).toBeInTheDocument();
    });
  });
});
```

### Testing Hooks with React Query

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("useReleases", () => {
  it("should fetch releases", async () => {
    const { result } = renderHook(() => useReleases(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### Testing API Routes

```typescript
// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => ({ userId: "user-1", orgId: "org-1" })),
}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    release: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("GET /api/releases", () => {
  it("should return releases", async () => {
    const mockReleases = [
      { id: "1", title: "Release 1" },
    ];

    prisma.release.findMany.mockResolvedValue(mockReleases);

    const response = await GET(new Request("http://localhost/api/releases"));
    const data = await response.json();

    expect(data).toEqual(mockReleases);
  });
});
```

### Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm run test:coverage

# Run specific test file
npm test src/hooks/use-releases.test.tsx
```

### Test Coverage Goals

- **Critical paths**: 100% coverage
- **API routes**: 90%+ coverage
- **Hooks**: 90%+ coverage
- **Components**: 70%+ coverage (focus on logic)
- **Services**: 90%+ coverage

## 🔄 Development Workflow

### 1. Setting Up Your Environment

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables
# Edit .env with your values

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### 2. Creating a Feature Branch

```bash
# Update main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Making Changes

1. **Write code** following the patterns in this guide
2. **Write tests** for new functionality
3. **Run tests** to ensure nothing breaks
4. **Test manually** in the browser
5. **Lint your code**: `npm run lint`

### 4. Committing Changes

Follow conventional commit format:

```bash
# Feature
git commit -m "feat: add release dependency tracking"

# Bug fix
git commit -m "fix: correct status transition validation"

# Documentation
git commit -m "docs: update API route patterns"

# Tests
git commit -m "test: add coverage for sprint hooks"

# Refactoring
git commit -m "refactor: simplify release card component"

# Chore
git commit -m "chore: update dependencies"
```

### 5. Opening a Pull Request

1. **Push your branch**: `git push origin feature/your-feature-name`
2. **Open PR** on GitHub
3. **Fill out PR template** with:
   - Description of changes
   - Testing performed
   - Screenshots (if UI changes)
   - Related issues
4. **Request review** from maintainers

### 6. PR Review Process

**Before requesting review:**
- ✅ All tests pass
- ✅ No linting errors
- ✅ Code follows conventions
- ✅ Documentation updated
- ✅ Self-review completed

**During review:**
- Respond to feedback promptly
- Make requested changes
- Re-request review after updates

**After approval:**
- Squash and merge into main
- Delete feature branch

### 7. Database Schema Changes

When modifying the Prisma schema:

```bash
# 1. Edit prisma/schema.prisma

# 2. Format schema
npx prisma format

# 3. Create migration (production)
npx prisma migrate dev --name descriptive_migration_name

# 4. Or push schema directly (development only)
npx prisma db push

# 5. Regenerate client
npx prisma generate
```

### 8. Adding Dependencies

```bash
# Add production dependency
npm install package-name

# Add dev dependency
npm install -D package-name

# Update package-lock.json
npm install
```

Always commit `package.json` and `package-lock.json` together.

## 🚀 Deployment

### Building for Production

```bash
# Build the application
npm run build

# Test production build locally
npm start
```

### Environment Variables

Ensure all required environment variables are set in production:
- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `TOKEN_ENCRYPTION_KEY`
- Optional: `JIRA_CLIENT_ID`, `GITHUB_CLIENT_ID`, etc.

### Database Migrations

For production deployments:

```bash
# Run migrations
npx prisma migrate deploy
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Errors

**"Error: DATABASE_URL not found"**
- Ensure your `.env` file exists in the root directory
- Verify `DATABASE_URL` is set correctly with proper connection string format
- Try restarting the development server

**"Can't reach database server"**
- Check that your database is running (if using local PostgreSQL)
- Verify database credentials in `DATABASE_URL`
- For Neon, ensure the connection string includes `?sslmode=require`
- Check firewall settings if using remote database

**"Prisma Client did not initialize"**
- Run `npx prisma generate` manually
- Delete `node_modules/.prisma` and run `npm install` again
- Ensure Prisma schema is valid: `npx prisma validate`

#### Clerk Authentication Issues

**"Clerk keys are not valid"**
- Double-check your Clerk keys in the `.env` file
- Ensure you're using the correct keys for your Clerk application
- Verify there are no extra spaces or quotes around keys
- Make sure you copied the entire key value

**"Webhook events not working locally"**
- Clerk webhooks require a public URL
- Use [ngrok](https://ngrok.com/) to expose your local server: `ngrok http 3000`
- Update the webhook URL in Clerk dashboard to your ngrok URL
- Ensure webhook secret matches your `.env` file

**"Organization not found"**
- Verify organizations are enabled in your Clerk dashboard
- Check that you're logged in with the correct account
- Try switching organizations or creating a new one

#### Build and Runtime Errors

**"Port 3000 is already in use"**
- Stop any other processes using port 3000
- Find the process: `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
- Kill the process or specify a different port: `PORT=3001 npm run dev`

**"Module not found" errors**
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Ensure import paths use the `@/` alias correctly

**"Type errors in production build"**
- Run `npm run build` locally to catch type errors
- Fix TypeScript errors before committing
- Check for `any` types that might be hiding issues

**Build fails with "Out of memory"**
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`
- Close other applications to free up memory
- Consider building on a machine with more RAM

#### Integration Issues

**Jira integration not working**
- Verify you've completed the OAuth flow (check Settings → Integrations)
- Ensure the service has a valid Jira Project Key configured
- Check that you have access to the Jira project
- Token may have expired - try disconnecting and reconnecting

**GitHub integration not working**
- Verify OAuth connection is active
- Ensure service has correct Repository Owner and Name
- For private repos, confirm your token has appropriate access
- Token may have been revoked - reconnect if needed

**Slack notifications not sending**
- Test the webhook: Settings → Notifications → Send Test Message
- Verify webhook URL is correct and starts with `https://hooks.slack.com`
- Check that the Slack channel still exists
- Webhook may have been revoked in Slack - create a new one if needed

#### Development Server Issues

**Hot reload not working**
- Save the file again to trigger rebuild
- Restart the development server
- Clear `.next` folder: `rm -rf .next && npm run dev`
- Check that file is inside the `src/` directory

**Changes not appearing**
- Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (macOS)
- Clear browser cache
- Check browser console for errors
- Ensure file was saved properly

**"Cannot find module" after adding new file**
- Ensure proper file extension (.ts, .tsx, .js, .jsx)
- Check import path uses correct alias (`@/`)
- Restart TypeScript server in VS Code: Cmd+Shift+P → "Restart TS Server"

### Getting Additional Help

If you continue to experience issues:

1. **Check Logs**: Look for error details in terminal and browser console
2. **Review Documentation**: Check README.md and this DEVELOPMENT guide
3. **Search Issues**: Look for similar issues in GitHub repository
4. **Clean Install**: Try removing node_modules and reinstalling
   ```bash
   rm -rf node_modules .next
   npm install
   npm run dev
   ```
5. **Contact Team**: Reach out in team chat or @ maintainers in PRs

## 🐛 Debugging

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Prisma Studio

View and edit database records:

```bash
npx prisma studio
```

Opens at `http://localhost:5555`

### React Query DevTools

Already configured in development. Look for the floating icon in the bottom-left corner.

## 📚 Additional Resources

### Key Documentation
- [Next.js App Router](https://nextjs.org/docs/app)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TanStack Query](https://tanstack.com/query/latest/docs/react/overview)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [Clerk Documentation](https://clerk.com/docs)

### Project-Specific Docs
- [README.md](../README.md) - Project overview and setup
- [Architecture Decisions](./ARCHITECTURE.md) - Architectural patterns and decisions
- [API Documentation](./API.md) - API endpoint reference

## ❓ Getting Help

- **Documentation**: Check this guide and the README
- **Code Examples**: Look at existing implementations in the codebase
- **Issues**: Search GitHub issues for similar problems
- **Team**: Ask in team chat or @ maintainers in PRs

## 🎯 Quick Reference

### Common Commands
```bash
npm run dev              # Start dev server
npm test                 # Run tests
npm run build            # Build for production
npm run lint             # Run linter
npx prisma studio        # Open database GUI
npx prisma db push       # Push schema changes
npx prisma generate      # Regenerate Prisma client
```

### Import Paths
```typescript
"@/components/*"         # Components
"@/hooks/*"             # Custom hooks
"@/lib/*"               # Utilities
"@/services/*"          # Business logic
```

### File Naming
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts`
- Utilities: `kebab-case.ts`
- API routes: `route.ts`
- Pages: `page.tsx`

---

Happy coding! 🚀
