// convex/utils/langsmith.ts - LangSmith tracing utilities for Convex
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

interface RAGTraceData {
  sessionId: string;
  question: string;
  retrievedDocs: Array<{
    filename: string;
    pageNumber: number | null;
    textPreview: string;
    chunkId: string;
  }>;
  searchResultsCount: number;
  responseLength: number;
  durationMs: number;
}

// Send RAG trace data to LangSmith via API route
export const sendRAGTrace = internalAction({
  args: {
    traceData: v.object({
      sessionId: v.string(),
      question: v.string(),
      retrievedDocs: v.array(v.object({
        filename: v.string(),
        pageNumber: v.union(v.number(), v.null()),
        textPreview: v.string(),
        chunkId: v.string(),
      })),
      searchResultsCount: v.number(),
      responseLength: v.number(),
      durationMs: v.number(),
    })
  },
  handler: async (ctx, { traceData }) => {
    try {
      // Get the base URL from environment or default to localhost
      // For development, always use localhost. For production, use the actual site URL
      const isDevelopment = process.env.NODE_ENV !== "production";
      const nextjsSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTJS_URL;
      const baseUrl = isDevelopment ? "http://localhost:3000" : (nextjsSiteUrl || "http://localhost:3000");
      const url = `${baseUrl}/api/langsmith`;
      
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(traceData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error };
      }

      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error sending LangSmith trace:", error);
      return { success: false, error: errorMessage };
    }
  },
});