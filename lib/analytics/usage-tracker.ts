// Initialize InstantDB admin client for analytics
// TODO: Implement actual database operations when needed
// Note: InstantDB integration commented out until schema is properly configured

export interface GenerationData {
  userId: string;
  componentName: string;
  group: string;
  qualityScore: number;
  aiProvider: string;
  executionTime: number;
  modelUsed: string;
  tokensUsed: number;
  generationTime: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageData {
  userId: string;
  action: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
}

export interface AnalyticsMetrics {
  totalGenerations: number;
  averageQuality: number;
  successRate: number;
  popularComponents: Array<{ name: string; count: number }>;
  qualityDistribution: Record<string, number>;
  providerPerformance: Record<
    string,
    { success: number; total: number; avgLatency: number }
  >;
  recentActivity: Array<{
    timestamp: Date;
    action: string;
    componentName?: string;
    qualityScore?: number;
  }>;
}

export class UsageTracker {
  private sessionCache = new Map<string, string>();
  private isEnabled = process.env.ANALYTICS_ENABLED === "true";
  private trackUsers = process.env.ANALYTICS_TRACK_USERS === "true";
  private trackGenerations = process.env.ANALYTICS_TRACK_GENERATIONS === "true";
  private trackPerformance = process.env.ANALYTICS_TRACK_PERFORMANCE === "true";

  /**
   * Track component generation with comprehensive analytics
   */
  async trackGeneration(data: GenerationData): Promise<void> {
    if (!this.isEnabled || !this.trackGenerations) {
      console.log("📊 Analytics disabled, skipping generation tracking");
      return;
    }

    try {
      const startTime = Date.now();

      // Store in InstantDB usage table
      await this.recordUsage({
        userId: data.userId,
        action: "generate",
        metadata: {
          componentName: data.componentName,
          group: data.group,
          qualityScore: data.qualityScore,
          aiProvider: data.aiProvider,
          executionTime: data.executionTime,
          modelUsed: data.modelUsed,
          tokensUsed: data.tokensUsed,
          generationTime: data.generationTime,
          success: data.success,
          error: data.error,
          ...data.metadata,
        },
        timestamp: new Date(),
      });

      // Track performance metrics
      if (this.trackPerformance) {
        await this.trackProviderPerformance(
          data.aiProvider,
          data.success,
          data.executionTime,
          data.error
        );
      }

      const trackingTime = Date.now() - startTime;
      console.log(
        `📊 Tracked generation: ${data.componentName} for user ${data.userId} (${trackingTime}ms)`
      );
    } catch (error) {
      console.error("❌ Failed to track generation:", error);
    }
  }

  /**
   * Track user actions (preview, download, share, etc.)
   */
  async trackUserAction(data: UsageData): Promise<void> {
    if (!this.isEnabled || !this.trackUsers) {
      return;
    }

    try {
      await this.recordUsage(data);
      console.log(`📊 Tracked action: ${data.action} for user ${data.userId}`);
    } catch (error) {
      console.error("❌ Failed to track user action:", error);
    }
  }

  /**
   * Track AI provider performance
   */
  async trackProviderPerformance(
    provider: string,
    success: boolean,
    latency: number,
    error?: string
  ): Promise<void> {
    if (!this.isEnabled || !this.trackPerformance) {
      return;
    }

    try {
      await this.recordUsage({
        userId: "system",
        action: "provider_performance",
        metadata: {
          provider,
          success,
          latency,
          error,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("❌ Failed to track provider performance:", error);
    }
  }

  /**
   * Track CLI generation events
   */
  async trackCLIGeneration(
    userId: string,
    componentName: string,
    group: string,
    success: boolean,
    executionTime: number,
    error?: string
  ): Promise<void> {
    if (!this.isEnabled || !this.trackGenerations) {
      return;
    }

    try {
      await this.trackGeneration({
        userId,
        componentName,
        group,
        qualityScore: success ? 85 : 0, // Default quality score for CLI
        aiProvider: "cli",
        executionTime,
        modelUsed: "local",
        tokensUsed: 0,
        generationTime: executionTime,
        success,
        error,
        metadata: {
          source: "cli",
          command: "generate",
        },
      });
    } catch (error) {
      console.error("❌ Failed to track CLI generation:", error);
    }
  }

  /**
   * Track API generation events
   */
  async trackAPIGeneration(
    userId: string,
    componentName: string,
    group: string,
    success: boolean,
    executionTime: number,
    aiProvider: string,
    qualityScore: number,
    error?: string
  ): Promise<void> {
    if (!this.isEnabled || !this.trackGenerations) {
      return;
    }

    try {
      await this.trackGeneration({
        userId,
        componentName,
        group,
        qualityScore,
        aiProvider,
        executionTime,
        modelUsed: aiProvider,
        tokensUsed: 0, // TODO: Track actual token usage
        generationTime: executionTime,
        success,
        error,
        metadata: {
          source: "api",
          endpoint: "/api/generate",
        },
      });
    } catch (error) {
      console.error("❌ Failed to track API generation:", error);
    }
  }

  /**
   * Get usage statistics for a user
   */
  async getUserStats(
    userId: string,
    period: "day" | "week" | "month" = "month"
  ): Promise<AnalyticsMetrics> {
    try {
      if (!this.isEnabled) {
        return this.getMockUserStats();
      }

      // Return mock data until InstantDB schema is properly configured
      // This prevents validation errors that were causing the 400 status
      console.log(
        `📊 Getting mock user stats for ${userId} (${period} period)`
      );
      return this.getMockUserStats();
    } catch (error) {
      console.error("❌ Failed to get user stats:", error);
      return this.getMockUserStats();
    }
  }

  /**
   * Get system-wide analytics
   */
  async getSystemAnalytics(): Promise<AnalyticsMetrics> {
    try {
      if (!this.isEnabled) {
        return this.getMockSystemStats();
      }

      // Return mock data until InstantDB schema is properly configured
      // This prevents validation errors that were causing the 400 status
      console.log("📊 Getting mock system analytics");
      return this.getMockSystemStats();
    } catch (error) {
      console.error("❌ Failed to get system analytics:", error);
      return this.getMockSystemStats();
    }
  }

  /**
   * Track billing usage for pricing tiers
   */
  async trackBillingUsage(
    userId: string,
    action: string,
    cost: number
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await this.recordUsage({
        userId,
        action: "billing",
        metadata: {
          action,
          cost,
          tier: await this.getUserTier(userId),
        },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("❌ Failed to track billing usage:", error);
    }
  }

  /**
   * Get user's current tier
   */
  private async getUserTier(userId: string): Promise<string> {
    try {
      if (!this.isEnabled) {
        return "alpha";
      }

      // Return default tier until InstantDB schema is properly configured
      // This prevents validation errors
      console.log(`📊 Returning default tier for user ${userId}`);
      return "alpha";
    } catch (error) {
      console.error("❌ Failed to get user tier:", error);
      return "alpha";
    }
  }

  /**
   * Record usage in InstantDB
   */
  private async recordUsage(data: UsageData): Promise<void> {
    try {
      if (!this.isEnabled) {
        console.log("📊 Usage recorded (mock):", JSON.stringify(data, null, 2));
        return;
      }

      // For now, log the usage data that would be stored
      // TODO: Implement proper InstantDB storage when schema is ready
      const usageData = {
        userId: data.userId,
        action: data.action,
        metadata: JSON.stringify(data.metadata),
        timestamp: data.timestamp.toISOString(),
        sessionId: data.sessionId || this.generateSessionId(data.userId),
        userAgent: data.userAgent,
        ip: data.ip,
      };

      console.log(
        `📊 Usage would be stored in InstantDB: ${data.action} for ${data.userId}`,
        JSON.stringify(usageData, null, 2)
      );

      // TODO: Uncomment when InstantDB schema is properly configured
      // await db.transact([{ usage: [usageData] }]);
    } catch (error) {
      console.error("❌ Failed to record usage:", error);
      throw error;
    }
  }

  /**
   * Process user statistics from InstantDB data
   */
  private processUserStats(usageData: unknown[]): AnalyticsMetrics {
    // TODO: Implement actual data processing when InstantDB is fully integrated
    console.log(
      "Processing user stats with data:",
      usageData.length,
      "records"
    );
    return this.getMockUserStats();
  }

  /**
   * Process system statistics from InstantDB data
   */
  private processSystemStats(usageData: unknown[]): AnalyticsMetrics {
    return this.processUserStats(usageData); // Same logic for now
  }

  /**
   * Calculate quality distribution
   */
  private calculateQualityDistribution(
    scores: number[]
  ): Record<string, number> {
    const distribution = {
      "A (90-100)": 0,
      "B (80-89)": 0,
      "C (70-79)": 0,
      "D (60-69)": 0,
      "F (0-59)": 0,
    };

    scores.forEach((score) => {
      if (score >= 90) distribution["A (90-100)"]++;
      else if (score >= 80) distribution["B (80-89)"]++;
      else if (score >= 70) distribution["C (70-79)"]++;
      else if (score >= 60) distribution["D (60-69)"]++;
      else distribution["F (0-59)"]++;
    });

    return distribution;
  }

  /**
   * Calculate provider performance
   */
  private calculateProviderPerformance(
    generations: Record<string, unknown>[]
  ): Record<string, { success: number; total: number; avgLatency: number }> {
    const providers: Record<
      string,
      { success: number; total: number; latencies: number[] }
    > = {};

    generations.forEach((g) => {
      const metadata = JSON.parse((g.metadata as string) || "{}");
      const provider = metadata.aiProvider || "unknown";
      const success = metadata.success ? 1 : 0;
      const latency = metadata.executionTime || 0;

      if (!providers[provider]) {
        providers[provider] = { success: 0, total: 0, latencies: [] };
      }

      providers[provider].success += success;
      providers[provider].total += 1;
      providers[provider].latencies.push(latency);
    });

    const result: Record<
      string,
      { success: number; total: number; avgLatency: number }
    > = {};

    Object.entries(providers).forEach(([provider, data]) => {
      result[provider] = {
        success: data.success,
        total: data.total,
        avgLatency:
          data.latencies.length > 0
            ? data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length
            : 0,
      };
    });

    return result;
  }

  /**
   * Get mock user statistics (fallback)
   */
  private getMockUserStats(): AnalyticsMetrics {
    return {
      totalGenerations: 42,
      averageQuality: 87.5,
      successRate: 96.2,
      popularComponents: [
        { name: "LoginForm", count: 15 },
        { name: "DashboardCard", count: 12 },
        { name: "UserProfile", count: 8 },
        { name: "DataTable", count: 5 },
        { name: "SettingsForm", count: 2 },
      ],
      qualityDistribution: {
        "A (90-100)": 25,
        "B (80-89)": 12,
        "C (70-79)": 3,
        "D (60-69)": 1,
        "F (0-59)": 1,
      },
      providerPerformance: {
        claude: { success: 38, total: 40, avgLatency: 2500 },
        gemini: { success: 35, total: 38, avgLatency: 1800 },
        openai: { success: 32, total: 35, avgLatency: 3200 },
      },
      recentActivity: [
        {
          timestamp: new Date(),
          action: "generate",
          componentName: "TodoApp",
          qualityScore: 90,
        },
      ],
    };
  }

  /**
   * Get mock system statistics (fallback)
   */
  private getMockSystemStats(): AnalyticsMetrics {
    return {
      totalGenerations: 1250,
      averageQuality: 84.3,
      successRate: 94.8,
      popularComponents: [
        { name: "LoginForm", count: 245 },
        { name: "DashboardCard", count: 198 },
        { name: "UserProfile", count: 156 },
        { name: "DataTable", count: 134 },
        { name: "SettingsForm", count: 98 },
      ],
      qualityDistribution: {
        "A (90-100)": 45,
        "B (80-89)": 35,
        "C (70-79)": 15,
        "D (60-69)": 3,
        "F (0-59)": 2,
      },
      providerPerformance: {
        claude: { success: 580, total: 600, avgLatency: 2800 },
        gemini: { success: 520, total: 550, avgLatency: 2200 },
        openai: { success: 480, total: 500, avgLatency: 3500 },
      },
      recentActivity: [
        {
          timestamp: new Date(),
          action: "generate",
          componentName: "TodoApp",
          qualityScore: 90,
        },
      ],
    };
  }

  /**
   * Get start date for period
   */
  private getStartDate(period: "day" | "week" | "month"): Date {
    const now = new Date();
    switch (period) {
      case "day":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Generate session ID for user
   */
  private generateSessionId(userId: string): string {
    if (!this.sessionCache.has(userId)) {
      this.sessionCache.set(
        userId,
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );
    }
    return this.sessionCache.get(userId)!;
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker();
