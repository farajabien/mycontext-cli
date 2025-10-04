interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  keyGenerator?: (req: { id: string }) => string;
}

interface RateLimitStore {
  [key: string]: {
    attempts: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async isAllowed(identifier: string): Promise<boolean> {
    const now = Date.now();
    const key = this.config.keyGenerator
      ? this.config.keyGenerator({ id: identifier })
      : identifier;

    // Clean up expired entries
    this.cleanup(now);

    const entry = this.store[key];

    if (!entry) {
      // First attempt
      this.store[key] = {
        attempts: 1,
        resetTime: now + this.config.windowMs,
      };
      return true;
    }

    if (now > entry.resetTime) {
      // Window expired, reset
      this.store[key] = {
        attempts: 1,
        resetTime: now + this.config.windowMs,
      };
      return true;
    }

    if (entry.attempts >= this.config.maxAttempts) {
      // Rate limit exceeded
      return false;
    }

    // Increment attempts
    entry.attempts++;
    return true;
  }

  async getRemainingAttempts(identifier: string): Promise<number> {
    const now = Date.now();
    const key = this.config.keyGenerator
      ? this.config.keyGenerator({ id: identifier })
      : identifier;

    this.cleanup(now);

    const entry = this.store[key];
    if (!entry || now > entry.resetTime) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - entry.attempts);
  }

  async getResetTime(identifier: string): Promise<number> {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator({ id: identifier })
      : identifier;
    const entry = this.store[key];
    return entry ? entry.resetTime : 0;
  }

  private cleanup(now: number): void {
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }
}

// Configure rate limiters based on environment variables
const loginLimiter = new RateLimiter({
  maxAttempts: parseInt(process.env.RATE_LIMIT_LOGIN_ATTEMPTS || "5"),
  windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || "900000"), // 15 minutes
});

const apiLimiter = new RateLimiter({
  maxAttempts: parseInt(process.env.RATE_LIMIT_API_REQUESTS || "100"),
  windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW || "60000"), // 1 minute
});

const mpesaLimiter = new RateLimiter({
  maxAttempts: parseInt(process.env.RATE_LIMIT_MPESA_STK || "10"),
  windowMs: parseInt(process.env.RATE_LIMIT_MPESA_WINDOW || "60000"), // 1 minute
});

// Rate limiting middleware for Express/Next.js
export function createRateLimitMiddleware(type: "login" | "api" | "mpesa") {
  return async (
    req: {
      body?: { email?: string; phoneNumber?: string };
      ip?: string;
      headers?: Record<string, string>;
    },
    res: {
      status: (code: number) => { json: (data: unknown) => void };
      set: (headers: Record<string, string | number>) => void;
    },
    next: () => void
  ) => {
    const identifier = getIdentifier(req, type);
    const limiter = getLimiter(type);

    const isAllowed = await limiter.isAllowed(identifier);

    if (!isAllowed) {
      const resetTime = await limiter.getResetTime(identifier);
      return res.status(429).json({
        error: "Rate limit exceeded",
        resetTime,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      });
    }

    // Add rate limit headers
    const remaining = await limiter.getRemainingAttempts(identifier);
    const reset = await limiter.getResetTime(identifier);

    const limiterInstance = getLimiter(type);
    res.set({
      "X-RateLimit-Limit": limiterInstance["config"].maxAttempts,
      "X-RateLimit-Remaining": remaining,
      "X-RateLimit-Reset": reset,
    });

    next();
  };
}

function getIdentifier(
  req: {
    body?: { email?: string; phoneNumber?: string };
    ip?: string;
    headers?: Record<string, string>;
  },
  type: string
): string {
  switch (type) {
    case "login":
      return req.body?.email || req.ip || "unknown";
    case "api":
      return req.headers?.["x-api-key"] || req.ip || "unknown";
    case "mpesa":
      return req.body?.phoneNumber || req.ip || "unknown";
    default:
      return req.ip || "unknown";
  }
}

function getLimiter(type: string): RateLimiter {
  switch (type) {
    case "login":
      return loginLimiter;
    case "api":
      return apiLimiter;
    case "mpesa":
      return mpesaLimiter;
    default:
      return apiLimiter;
  }
}

// Export individual limiters for direct use
export { loginLimiter, apiLimiter, mpesaLimiter };

// Export types
export type { RateLimitConfig, RateLimitStore };
