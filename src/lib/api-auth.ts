import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { hashApiKey } from "./api-key-manager";
import type { Team, ApiKey } from "@prisma/client";

export type ValidatedApiKey = {
  team: Team;
  apiKey: ApiKey;
};

/**
 * Validates an API key from the request headers
 * Returns the team and API key if valid, null if invalid
 *
 * Checks:
 * - X-API-Key header is present
 * - API key exists in database
 * - API key is active
 * - API key has not expired
 * - Updates lastUsedAt timestamp
 */
export async function validateApiKey(
  request: NextRequest
): Promise<ValidatedApiKey | null> {
  // Extract API key from header
  const apiKeyHeader = request.headers.get("X-API-Key");

  if (!apiKeyHeader) {
    return null;
  }

  try {
    // Hash the provided key to compare with stored hash
    const hashedKey = hashApiKey(apiKeyHeader);

    // Find the API key in the database
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      include: {
        team: true,
      },
    });

    if (!apiKey) {
      return null;
    }

    // Check if the key is active
    if (!apiKey.isActive) {
      return null;
    }

    // Check if the key has expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update lastUsedAt timestamp (fire and forget)
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        // Log error but don't fail the request
        console.error("Failed to update API key lastUsedAt:", error);
      });

    return {
      team: apiKey.team,
      apiKey,
    };
  } catch (error) {
    // Invalid key format or database error
    return null;
  }
}
