// src/hooks/useLangSmithSync.ts - Hook to automatically sync RAG traces to LangSmith
import { useEffect, useRef } from "react";

export function useLangSmithSync() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const syncTraces = async () => {
    try {
      const response = await fetch("/api/langsmith-sync", {
        method: "POST",
      });
      
      if (!response.ok) {
        console.warn("LangSmith sync failed:", response.statusText);
        return;
      }

      const result = await response.json();
      
      if (result.successCount > 0) {
        console.log(`LangSmith sync: ${result.successCount} traces sent successfully`);
      }
      
      if (result.errorCount > 0) {
        console.warn(`LangSmith sync: ${result.errorCount} traces failed`);
      }
    } catch (error) {
      console.warn("LangSmith sync error:", error);
    }
  };

  useEffect(() => {
    // Only run in development or if explicitly enabled
    const shouldSync = process.env.NODE_ENV === "development" || 
                       process.env.NEXT_PUBLIC_LANGSMITH_TRACING === "true";

    console.log("LangSmith sync hook:", {
      shouldSync,
      nodeEnv: process.env.NODE_ENV,
      tracingEnabled: process.env.NEXT_PUBLIC_LANGSMITH_TRACING
    });

    if (!shouldSync) {
      console.log("LangSmith sync disabled");
      return;
    }

    console.log("Starting LangSmith sync...");
    
    // Sync immediately
    syncTraces();

    // Set up interval to sync every 30 seconds
    intervalRef.current = setInterval(() => {
      console.log("Running scheduled LangSmith sync...");
      syncTraces();
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Manual sync function
  const manualSync = () => {
    syncTraces();
  };

  return { manualSync };
}