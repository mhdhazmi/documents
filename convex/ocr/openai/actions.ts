// convex/ocr/openai/actions.ts - Create new file or add to existing

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";

export const cleanPage = internalAction({
  args: {
    pageId: v.id("pages"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, args) => {
    const { pageId, source } = args;
    
    try {
      // Mark as started
      await ctx.runMutation(internal.ocr.openai.mutations.updatePageCleaningStatus, { 
        pageId, 
        source, 
        cleaningStatus: "started" 
      });
      
      // Get the base URL for our HTTP endpoint
      const HTTP_BASE = process.env.CONVEX_SITE_URL;
      if (!HTTP_BASE) {
        throw new Error("Missing CONVEX_SITE_URL environment variable");
      }
      
      // Call the /cleanPage HTTP endpoint
      const res = await fetch(`${HTTP_BASE}/cleanPage`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId, source }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`cleanPage HTTP failed: ${res.status} - ${errorText}`);
      }
      
      // Drain the stream to ensure completion
      await res.text();
      
      console.log(`Successfully cleaned page ${pageId} with ${source} OCR via HTTP`);
      
      return {
        success: true,
        pageId,
        source
      };
    } catch (error) {
      console.error(`Error cleaning page ${pageId} with ${source} OCR:`, error);
      throw error;
    }
  },
});