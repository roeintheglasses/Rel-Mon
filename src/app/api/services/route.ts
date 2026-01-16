import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createServiceSchema } from "@/lib/validations/service";

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
    let slug = baseSlug;
    let counter = 1;

    // Ensure unique slug
    while (
      await prisma.service.findUnique({
        where: { teamId_slug: { teamId: team.id, slug } },
      })
    ) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

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
