import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createServiceSchema } from "@/lib/validations/service";
import { Prisma } from "@/generated/prisma";

/**
 * Convert text to URL-friendly slug
 * @param text - Text to slugify
 * @returns Lowercase slug with hyphens
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * GET /api/services - List all services for the current team
 * @description Fetches all services with release count
 * @returns JSON array of services ordered by name
 */
export async function GET() {
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

    const services = await prisma.service.findMany({
      where: { teamId: team.id },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { releases: true },
        },
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services - Create a new service
 * @description Creates a new service with unique slug generation
 * @param request - HTTP request with service data in body
 * @returns JSON of created service
 */
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

    const body = await request.json();
    const validatedData = createServiceSchema.parse(body);

    // Generate slug from name
    const baseSlug = slugify(validatedData.name);

    // Validate that slug is not empty (name must contain alphanumeric characters)
    if (!baseSlug) {
      return NextResponse.json(
        { error: "Service name must contain at least one alphanumeric character" },
        { status: 400 }
      );
    }

    // Try to create with retry logic to handle race conditions
    const MAX_RETRIES = 5;
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Generate slug with counter if not first attempt
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;

        const service = await prisma.service.create({
          data: {
            ...validatedData,
            slug,
            teamId: team.id,
            repoUrl: validatedData.repoUrl || null,
          },
        });

        return NextResponse.json(service, { status: 201 });
      } catch (error) {
        // If unique constraint violation (P2002), retry with incremented counter
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          lastError = error;
          continue;
        }
        // For other errors, throw immediately
        throw error;
      }
    }

    // If all retries exhausted, return error
    console.error("Failed to create unique slug after retries:", lastError);
    return NextResponse.json(
      { error: "Failed to generate unique service slug. Please try a different name." },
      { status: 409 }
    );
  } catch (error) {
    console.error("Error creating service:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}
