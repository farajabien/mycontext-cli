import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (in production, use Redis or similar)
const store: RateLimitStore = {};

export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || "anonymous",
    skipSuccessfulRequests: _skipSuccessfulRequests = false,
    skipFailedRequests: _skipFailedRequests = false,
  } = config;

  return async (req: NextRequest, res: NextResponse) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const _windowStart = now - windowMs;

    // Clean up expired entries
    Object.keys(store).forEach((k) => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });

    // Get or create rate limit entry
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    const entry = store[key];

    // Check if window has expired
    if (entry.resetTime < now) {
      entry.count = 0;
      entry.resetTime = now + windowMs;
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          retryAfter,
          limit: maxRequests,
          remaining: 0,
          resetTime: entry.resetTime,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": entry.resetTime.toString(),
          },
        }
      );
    }

    // Increment counter
    entry.count++;

    // Add rate limit headers to response
    res.headers.set("X-RateLimit-Limit", maxRequests.toString());
    res.headers.set(
      "X-RateLimit-Remaining",
      Math.max(0, maxRequests - entry.count).toString()
    );
    res.headers.set("X-RateLimit-Reset", entry.resetTime.toString());

    return res;
  };
}

// Predefined rate limit configurations
export const rateLimits = {
  // Free tier: 100 requests per hour
  free: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
  }),

  // Pro tier: 1000 requests per hour
  pro: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
  }),

  // Enterprise tier: 10000 requests per hour
  enterprise: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10000,
  }),

  // Strict rate limit for auth endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  }),

  // Generous rate limit for pricing/status endpoints
  public: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  }),
};

// Helper function to get rate limit based on user subscription
export function getRateLimitForUser(subscriptionStatus: string) {
  switch (subscriptionStatus) {
    case "pro":
      return rateLimits.pro;
    case "enterprise":
      return rateLimits.enterprise;
    default:
      return rateLimits.free;
  }
}

// Helper function to check if request should be rate limited
export async function checkRateLimit(
  req: NextRequest,
  subscriptionStatus: string = "free"
): Promise<NextResponse | null> {
  const rateLimit = getRateLimitForUser(subscriptionStatus);
  const res = new NextResponse();

  const rateLimitResult = await rateLimit(req, res);

  if (rateLimitResult.status === 429) {
    return rateLimitResult;
  }

  return null;
}
