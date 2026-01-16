import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, type ValidatedApiKey } from "./api-auth";
import { checkRateLimit } from "./rate-limit";

/**
 * Handler function type for public API routes
 * Receives the validated team and API key along with the request
 */
type PublicApiHandler<T = any> = (
  request: NextRequest,
  context: ValidatedApiKey & { params?: T }
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function that wraps API route handlers with authentication and rate limiting
 *
 * Authentication:
 * - Validates API key from X-API-Key header
 * - Returns 401 if key is missing, invalid, inactive, or expired
 *
 * Rate Limiting:
 * - Enforces 100 requests per minute per API key
 * - Returns 429 if limit exceeded
 * - Adds rate limit headers to all responses
 *
 * @param handler - The API route handler to wrap
 * @returns Wrapped handler with auth and rate limiting
 *
 * @example
 * export const GET = withApiAuth(async (request, { team, apiKey }) => {
 *   // Handler has access to validated team and apiKey
 *   return NextResponse.json({ data: "..." });
 * });
 */
export function withApiAuth<T = any>(
  handler: PublicApiHandler<T>
): (request: NextRequest, context: { params?: T }) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    context: { params?: T } = {}
  ): Promise<NextResponse> => {
    try {
      // Validate API key
      const validated = await validateApiKey(request);

      if (!validated) {
        return NextResponse.json(
          { error: "Unauthorized. Valid API key required." },
          {
            status: 401,
            headers: {
              "WWW-Authenticate": 'ApiKey realm="API"',
            },
          }
        );
      }

      const { team, apiKey } = validated;

      // Check rate limiting
      const rateLimitResult = checkRateLimit(apiKey.id);

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: "Too many requests. Please try again later.",
            resetAt: rateLimitResult.resetAt.toISOString(),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": "100",
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
              "Retry-After": Math.ceil(
                (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
              ).toString(),
            },
          }
        );
      }

      // Call the handler with validated context
      const response = await handler(request, {
        team,
        apiKey,
        params: context.params,
      });

      // Add rate limit headers to successful responses
      response.headers.set("X-RateLimit-Limit", "100");
      response.headers.set(
        "X-RateLimit-Remaining",
        rateLimitResult.remaining.toString()
      );
      response.headers.set(
        "X-RateLimit-Reset",
        rateLimitResult.resetAt.toISOString()
      );

      return response;
    } catch (error) {
      // Handle unexpected errors
      console.error("Public API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
