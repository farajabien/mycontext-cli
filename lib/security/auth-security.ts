import { loginLimiter } from "./rate-limiting";
import { validateEmail, validatePassword } from "./validation";

interface SecurityEvent {
  timestamp: number;
  type:
    | "login_attempt"
    | "login_success"
    | "login_failure"
    | "account_locked"
    | "suspicious_activity";
  userId?: string;
  email?: string;
  ip: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

interface AccountLockout {
  email: string;
  lockedUntil: number;
  attempts: number;
}

class AuthSecurity {
  private securityEvents: SecurityEvent[] = [];
  private accountLockouts: Map<string, AccountLockout> = new Map();
  private readonly maxLockoutDuration = 30 * 60 * 1000; // 30 minutes
  private readonly maxFailedAttempts = 5;

  async validateLoginAttempt(
    email: string,
    password: string,
    ip: string,
    userAgent?: string
  ): Promise<{
    allowed: boolean;
    reason?: string;
    lockoutTime?: number;
  }> {
    // Log the attempt
    this.logSecurityEvent({
      timestamp: Date.now(),
      type: "login_attempt",
      email,
      ip,
      userAgent,
    });

    // Check if account is locked
    const lockout = this.accountLockouts.get(email);
    if (lockout && Date.now() < lockout.lockedUntil) {
      this.logSecurityEvent({
        timestamp: Date.now(),
        type: "login_attempt",
        email,
        ip,
        userAgent,
        details: { reason: "account_locked", lockoutTime: lockout.lockedUntil },
      });

      return {
        allowed: false,
        reason: "Account temporarily locked due to too many failed attempts",
        lockoutTime: lockout.lockedUntil,
      };
    }

    // Check rate limiting
    const rateLimitAllowed = await loginLimiter.isAllowed(email);
    if (!rateLimitAllowed) {
      this.logSecurityEvent({
        timestamp: Date.now(),
        type: "login_attempt",
        email,
        ip,
        userAgent,
        details: { reason: "rate_limit_exceeded" },
      });

      return {
        allowed: false,
        reason: "Too many login attempts. Please try again later.",
      };
    }

    // Validate input
    const emailValid = await validateEmail(email);
    const passwordValid = await validatePassword(password);

    if (!emailValid || !passwordValid) {
      this.logSecurityEvent({
        timestamp: Date.now(),
        type: "login_failure",
        email,
        ip,
        userAgent,
        details: { reason: "invalid_input" },
      });

      return {
        allowed: false,
        reason: "Invalid email or password format",
      };
    }

    return { allowed: true };
  }

  async recordLoginSuccess(
    email: string,
    userId: string,
    ip: string,
    userAgent?: string
  ): Promise<void> {
    // Clear any lockout for this account
    this.accountLockouts.delete(email);

    this.logSecurityEvent({
      timestamp: Date.now(),
      type: "login_success",
      userId,
      email,
      ip,
      userAgent,
    });
  }

  async recordLoginFailure(
    email: string,
    ip: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    // Increment failed attempts
    const lockout = this.accountLockouts.get(email) || {
      email,
      lockedUntil: 0,
      attempts: 0,
    };

    lockout.attempts++;

    // Check if account should be locked
    if (lockout.attempts >= this.maxFailedAttempts) {
      lockout.lockedUntil = Date.now() + this.maxLockoutDuration;

      this.logSecurityEvent({
        timestamp: Date.now(),
        type: "account_locked",
        email,
        ip,
        userAgent,
        details: {
          reason: "too_many_failed_attempts",
          attempts: lockout.attempts,
          lockoutDuration: this.maxLockoutDuration,
        },
      });
    }

    this.accountLockouts.set(email, lockout);

    this.logSecurityEvent({
      timestamp: Date.now(),
      type: "login_failure",
      email,
      ip,
      userAgent,
      details: {
        reason: reason || "invalid_credentials",
        attempts: lockout.attempts,
      },
    });
  }

  async detectSuspiciousActivity(
    userId: string,
    activity: string,
    ip: string,
    userAgent?: string
  ): Promise<boolean> {
    // Simple suspicious activity detection
    const suspiciousPatterns = [
      /script/i,
      /javascript/i,
      /<.*>/,
      /union.*select/i,
      /drop.*table/i,
    ];

    const isSuspicious = suspiciousPatterns.some((pattern) =>
      pattern.test(activity)
    );

    if (isSuspicious) {
      this.logSecurityEvent({
        timestamp: Date.now(),
        type: "suspicious_activity",
        userId,
        ip,
        userAgent,
        details: {
          activity,
          reason: "suspicious_pattern_detected",
        },
      });
    }

    return isSuspicious;
  }

  async validateSession(
    sessionId: string,
    userId: string,
    ip: string
  ): Promise<boolean> {
    // Basic session validation
    // In a real implementation, you'd check against a session store
    const sessionValid = Boolean(sessionId && userId && ip);

    if (!sessionValid) {
      this.logSecurityEvent({
        timestamp: Date.now(),
        type: "suspicious_activity",
        userId,
        ip,
        details: {
          reason: "invalid_session",
          sessionId,
        },
      });
    }

    return sessionValid;
  }

  private logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("Security Event:", {
        ...event,
        timestamp: new Date(event.timestamp).toISOString(),
      });
    }
  }

  getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  getAccountLockouts(): AccountLockout[] {
    return Array.from(this.accountLockouts.values());
  }

  clearAccountLockout(email: string): boolean {
    return this.accountLockouts.delete(email);
  }

  // Cleanup old lockouts
  cleanup(): void {
    const now = Date.now();
    for (const [email, lockout] of this.accountLockouts.entries()) {
      if (now > lockout.lockedUntil) {
        this.accountLockouts.delete(email);
      }
    }
  }
}

// Export singleton instance
export const authSecurity = new AuthSecurity();

// Export types
export type { SecurityEvent, AccountLockout };
