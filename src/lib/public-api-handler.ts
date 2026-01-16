import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, type ValidatedApiKey } from "./api-auth";
import { checkRateLimit } from "./rate-limit";
import type { ApiKeyScope } from "./validations/api-key";

/**
 * Handler function type for public API routes
 * Receives the validated team and API key along with the request
 */
type PublicApiHandler<T = any> = (
  request: NextRequest,
  context: ValidatedApiKey & { params?: T }
) => Promise<NextResponse> | NextResponse;

/**
 * Options for withApiAuth wrapper
 */
type WithApiAuthOptions = {
  /** Required scopes for this endpoint. If any scope matches, access is granted. */
  requiredScopes?: ApiKeyScope[];
};

/**
 * Higher-order function that wraps API route handlers with authentication, scope checking, and rate limiting
 *
 * Authentication:
 * - Validates API key from X-API-Key header
 * - Returns 401 if key is missing, invalid, inactive, or expired
 *
 * Scope Checking:
 * - Verifies API key has at least one of the required scopes
 * - Returns 403 if scope check fails
 *
 * Rate Limiting:
 * - Enforces 100 requests per minute per API key
 * - Returns 429 if limit exceeded
 * - Adds rate limit headers to all responses
 *
 * @param handler - The API route handler to wrap
 * @param options - Optional configuration including required scopes
 * @returns Wrapped handler with auth, scope checking, and rate limiting
 *
 * @example
 * export const GET = withApiAuth(async (request, { team, apiKey }) => {
 *   // Handler has access to validated team and apiKey
 *   return NextResponse.json({ data: "..." });
 * }, { requiredScopes: ["releases:read"] });
 */
export function withApiAuth<T = any>(
  handler: PublicApiHandler<T>,
  options: WithApiAuthOptions = {}
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

      // Check required scopes
      if (options.requiredScopes && options.requiredScopes.length > 0) {
        const keyScopes = apiKey.scopes as string[];
        const hasRequiredScope = options.requiredScopes.some((scope) =>
          keyScopes.includes(scope)
        );

        if (!hasRequiredScope) {
          return NextResponse.json(
            {
              error: "Forbidden. Insufficient permissions.",
              message: `This endpoint requires one of: ${options.requiredScopes.join(", ")}`,
              requiredScopes: options.requiredScopes,
              yourScopes: keyScopes,
            },
            { status: 403 }
          );
        }
      }

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
