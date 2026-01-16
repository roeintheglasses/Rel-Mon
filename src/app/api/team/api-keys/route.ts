import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createApiKeySchema } from "@/lib/validations/api-key";
import { generateApiKey, hashApiKey } from "@/lib/api-key-manager";

// GET /api/team/api-keys - List all API keys for the current team
export async function GET(request: Request) {
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

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        teamId: team.id,
      },
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json(apiKeys);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST /api/team/api-keys - Create a new API key
export async function POST(request: Request) {
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

    const body = await request.json();
    const validatedData = createApiKeySchema.parse(body);

    // Generate the plaintext key
    const plaintextKey = generateApiKey();
    const hashedKey = hashApiKey(plaintextKey);

    // Parse expiresAt if provided
    let expiresAt: Date | undefined;
    if (validatedData.expiresAt) {
      expiresAt = new Date(validatedData.expiresAt);
      // Validate that the date is in the future
      if (expiresAt <= new Date()) {
        return NextResponse.json(
          { error: "Expiration date must be in the future" },
          { status: 400 }
        );
      }
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        name: validatedData.name,
        key: hashedKey,
        scopes: validatedData.scopes,
        teamId: team.id,
        expiresAt: expiresAt,
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

    // Return the plaintext key ONLY on creation
    // This is the only time the user will see it
    return NextResponse.json({
      ...apiKey,
      key: plaintextKey,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
