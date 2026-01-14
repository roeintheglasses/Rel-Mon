import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createSprintSchema } from "@/lib/validations/sprint";

// GET /api/sprints - List all sprints for the current team
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const sprints = await prisma.sprint.findMany({
      where: {
        teamId: team.id,
        ...(status ? { status: status as "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED" } : {}),
      },
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { releases: true },
        },
      },
    });

    return NextResponse.json(sprints);
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return NextResponse.json(
      { error: "Failed to fetch sprints" },
      { status: 500 }
    );
  }
}

// POST /api/sprints - Create a new sprint
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
    const validatedData = createSprintSchema.parse(body);

    // Validate dates
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    const sprint = await prisma.sprint.create({
      data: {
        name: validatedData.name,
        startDate,
        endDate,
        goal: validatedData.goal || null,
        teamId: team.id,
        status: "PLANNING",
      },
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    console.error("Error creating sprint:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create sprint" },
      { status: 500 }
    );
  }
}
