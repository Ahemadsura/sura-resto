// Rate limiter utility to prevent brute force attacks
interface LoginAttempt {
  attempts: number;
  lastAttempt: Date;
  blockedUntil?: Date;
}

class RateLimiter {
  private attempts: Map<string, LoginAttempt> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW = 60 * 1000; // 1 minute window for attempts

  constructor() {
    // Clean up old attempts every 30 minutes
    setInterval(() => this.cleanup(), 30 * 60 * 1000);
  }

  /**
   * Check if an IP/email can attempt login
   */
  canAttemptLogin(identifier: string): { allowed: boolean; remainingAttempts?: number; blockedUntil?: Date } {
    const attempt = this.attempts.get(identifier);
    
    if (!attempt) {
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }

    // Check if currently blocked
    if (attempt.blockedUntil && new Date() < attempt.blockedUntil) {
      return { 
        allowed: false, 
        blockedUntil: attempt.blockedUntil 
      };
    }

    // Reset attempts if enough time has passed since last attempt
    if (new Date().getTime() - attempt.lastAttempt.getTime() > this.ATTEMPT_WINDOW) {
      this.attempts.delete(identifier);
      return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS };
    }

    // Check if max attempts exceeded
    if (attempt.attempts >= this.MAX_ATTEMPTS) {
      const blockedUntil = new Date(Date.now() + this.BLOCK_DURATION);
      this.attempts.set(identifier, {
        ...attempt,
        blockedUntil
      });
      return { allowed: false, blockedUntil };
    }

    return { 
      allowed: true, 
      remainingAttempts: this.MAX_ATTEMPTS - attempt.attempts 
    };
  }

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt(identifier: string): void {
    const existing = this.attempts.get(identifier);
    const now = new Date();

    if (!existing) {
      this.attempts.set(identifier, {
        attempts: 1,
        lastAttempt: now
      });
      return;
    }

    // If it's been more than the attempt window, reset
    if (now.getTime() - existing.lastAttempt.getTime() > this.ATTEMPT_WINDOW) {
      this.attempts.set(identifier, {
        attempts: 1,
        lastAttempt: now
      });
      return;
    }

    // Increment attempts
    this.attempts.set(identifier, {
      attempts: existing.attempts + 1,
      lastAttempt: now,
      blockedUntil: existing.blockedUntil
    });
  }

  /**
   * Record a successful login (clears attempts)
   */
  recordSuccessfulLogin(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get remaining time for blocked identifier
   */
  getBlockedTime(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt?.blockedUntil) return 0;
    
    const remaining = attempt.blockedUntil.getTime() - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Clean up old attempts
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - (this.BLOCK_DURATION + this.ATTEMPT_WINDOW);

    const entries = Array.from(this.attempts.entries());
    for (const [identifier, attempt] of entries) {
      // Remove if old and not currently blocked
      if (attempt.lastAttempt.getTime() < cutoff && 
          (!attempt.blockedUntil || attempt.blockedUntil.getTime() < now)) {
        this.attempts.delete(identifier);
      }
    }
  }

  /**
   * Format remaining time for user display
   */
  formatBlockedTime(milliseconds: number): string {
    const minutes = Math.ceil(milliseconds / (60 * 1000));
    if (minutes <= 1) return 'less than a minute';
    return `${minutes} minutes`;
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export types for use in components
export type { LoginAttempt }; 