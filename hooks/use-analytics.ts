import { useCallback, useState, useEffect } from "react";
import {
  usageTracker,
  GenerationData,
  UsageData,
  AnalyticsMetrics,
} from "../lib/analytics/usage-tracker";

/**
 * Hook for tracking component generation
 */
export function useGenerationTracking() {
  const [isTracking, setIsTracking] = useState(false);

  const trackGeneration = useCallback(
    async (data: Omit<GenerationData, "generationTime">) => {
      setIsTracking(true);
      try {
        const generationData: GenerationData = {
          ...data,
          generationTime: Date.now(),
        };

        await usageTracker.trackGeneration(generationData);
        console.log("✅ Generation tracked successfully");
      } catch (error) {
        console.error("❌ Failed to track generation:", error);
      } finally {
        setIsTracking(false);
      }
    },
    []
  );

  return {
    trackGeneration,
    isTracking,
  };
}

/**
 * Hook for tracking user actions
 */
export function useActionTracking() {
  const [isTracking, setIsTracking] = useState(false);

  const trackAction = useCallback(
    async (
      userId: string,
      action: string,
      metadata: Record<string, any> = {}
    ) => {
      setIsTracking(true);
      try {
        const usageData: UsageData = {
          userId,
          action,
          metadata,
          timestamp: new Date(),
          sessionId: `session_${Date.now()}`,
          userAgent:
            typeof window !== "undefined"
              ? window.navigator.userAgent
              : undefined,
        };

        await usageTracker.trackUserAction(usageData);
        console.log(`✅ Action tracked: ${action}`);
      } catch (error) {
        console.error("❌ Failed to track action:", error);
      } finally {
        setIsTracking(false);
      }
    },
    []
  );

  return {
    trackAction,
    isTracking,
  };
}

/**
 * Hook for retrieving user analytics
 */
export function useUserAnalytics(
  userId: string,
  period: "day" | "week" | "month" = "month"
) {
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await usageTracker.getUserStats(userId, period);
        setAnalytics(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch analytics"
        );
        console.error("❌ Failed to fetch user analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userId, period]);

  const refetch = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await usageTracker.getUserStats(userId, period);
      setAnalytics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch analytics"
      );
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  return {
    analytics,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for retrieving system analytics
 */
export function useSystemAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await usageTracker.getSystemAnalytics();
        setAnalytics(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch system analytics"
        );
        console.error("❌ Failed to fetch system analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usageTracker.getSystemAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch system analytics"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analytics,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for tracking component preview
 */
export function usePreviewTracking() {
  const { trackAction } = useActionTracking();

  const trackPreview = useCallback(
    async (userId: string, componentId: string, componentName: string) => {
      await trackAction(userId, "preview", {
        componentId,
        componentName,
        timestamp: Date.now(),
      });
    },
    [trackAction]
  );

  return { trackPreview };
}

/**
 * Hook for tracking component download
 */
export function useDownloadTracking() {
  const { trackAction } = useActionTracking();

  const trackDownload = useCallback(
    async (
      userId: string,
      componentId: string,
      componentName: string,
      format: "tsx" | "jsx" | "zip" = "tsx"
    ) => {
      await trackAction(userId, "download", {
        componentId,
        componentName,
        format,
        timestamp: Date.now(),
      });
    },
    [trackAction]
  );

  return { trackDownload };
}

/**
 * Hook for tracking component share
 */
export function useShareTracking() {
  const { trackAction } = useActionTracking();

  const trackShare = useCallback(
    async (
      userId: string,
      componentId: string,
      componentName: string,
      shareMethod: "link" | "embed" | "social"
    ) => {
      await trackAction(userId, "share", {
        componentId,
        componentName,
        shareMethod,
        timestamp: Date.now(),
      });
    },
    [trackAction]
  );

  return { trackShare };
}

/**
 * Hook for tracking page views
 */
export function usePageViewTracking() {
  const { trackAction } = useActionTracking();

  const trackPageView = useCallback(
    async (
      userId: string,
      page: string,
      metadata: Record<string, any> = {}
    ) => {
      await trackAction(userId, "page_view", {
        page,
        ...metadata,
        timestamp: Date.now(),
      });
    },
    [trackAction]
  );

  return { trackPageView };
}

/**
 * Hook for tracking errors
 */
export function useErrorTracking() {
  const { trackAction } = useActionTracking();

  const trackError = useCallback(
    async (userId: string, error: Error, context: Record<string, any> = {}) => {
      await trackAction(userId, "error", {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context,
        timestamp: Date.now(),
      });
    },
    [trackAction]
  );

  return { trackError };
}

/**
 * Hook for tracking performance metrics
 */
export function usePerformanceTracking() {
  const { trackAction } = useActionTracking();

  const trackPerformance = useCallback(
    async (
      userId: string,
      metric: string,
      value: number,
      unit: string = "ms"
    ) => {
      await trackAction(userId, "performance", {
        metric,
        value,
        unit,
        timestamp: Date.now(),
      });
    },
    [trackAction]
  );

  return { trackPerformance };
}
