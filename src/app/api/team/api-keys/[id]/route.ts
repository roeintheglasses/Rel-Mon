import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateApiKeySchema } from "@/lib/validations/api-key";

// GET /api/team/api-keys/[id] - Get a specific API key
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        teamId: team.id,
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        // Never return the key field
      },
    });

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json(apiKey);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 }
    );
  }
}

// PATCH /api/team/api-keys/[id] - Update an API key
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const { id } = await params;

    // Verify the API key exists and belongs to the team
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id,
        teamId: team.id,
      },
    });

    if (!existingKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateApiKeySchema.parse(body);

    const updatedApiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
        ...(validatedData.scopes !== undefined && { scopes: validatedData.scopes }),
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedApiKey);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

// DELETE /api/team/api-keys/[id] - Delete an API key
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();

    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const { id } = await params;

    // Verify the API key exists and belongs to the team
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id,
        teamId: team.id,
      },
    });

    if (!existingKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
