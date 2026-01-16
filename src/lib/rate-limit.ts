/**
 * In-memory rate limiting service using sliding window algorithm
 * Enforces 100 requests per minute per API key
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 100;

type RateLimitEntry = {
  timestamps: number[];
};

// In-memory store for rate limit tracking
// Maps API key ID to request timestamps
const rateLimitStore = new Map<string, RateLimitEntry>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

/**
 * Checks if a request should be allowed based on rate limiting rules
 * Uses sliding window algorithm to track requests over time
 *
 * @param keyId - The API key ID to check rate limiting for
 * @returns Object with allowed status, remaining requests, and reset time
 */
export function checkRateLimit(keyId: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Get or create the rate limit entry for this key
  let entry = rateLimitStore.get(keyId);

  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(keyId, entry);
  }

  // Remove timestamps outside the current window (sliding window)
  entry.timestamps = entry.timestamps.filter((timestamp) => timestamp > windowStart);

  // Calculate remaining requests
  const currentCount = entry.timestamps.length;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - currentCount - 1);

  // Check if the request should be allowed
  const allowed = currentCount < RATE_LIMIT_MAX_REQUESTS;

  if (allowed) {
    // Add current request timestamp
    entry.timestamps.push(now);
  }

  // Calculate reset time (when the oldest request will expire)
  const oldestTimestamp = entry.timestamps[0] || now;
  const resetAt = new Date(oldestTimestamp + RATE_LIMIT_WINDOW_MS);

  return {
    allowed,
    remaining,
    resetAt,
  };
}

/**
 * Clears rate limit data for a specific API key
 * Useful for testing or when an API key is revoked
 *
 * @param keyId - The API key ID to clear rate limit data for
 */
export function clearRateLimit(keyId: string): void {
  rateLimitStore.delete(keyId);
}

/**
 * Clears all rate limit data
 * Useful for testing or maintenance
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
