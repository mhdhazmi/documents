// convex/ocr/openai/actions.ts - Create new file or add to existing

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";

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
      
      // Get the OCR results based on the source
      let ocrResults;
      if (source === "gemini") {
        ocrResults = await ctx.runQuery(api.ocr.gemini.queries.getPageOcrResults, { pageId });
      } else {
        ocrResults = await ctx.runQuery(api.ocr.replicate.queries.getPageOcrResults, { pageId });
      }
      
      if (!ocrResults?.ocrResults || ocrResults.ocrResults.ocrStatus !== "completed") {
        throw new Error(`${source} OCR not completed for page ${pageId}`);
      }
      
      const extractedText = ocrResults.ocrResults.extractedText;
      if (!extractedText || extractedText.trim() === "") {
        throw new Error(`No text found to clean for page ${pageId}`);
      }
      
      // Rather than implementing the cleaning here, we'll let the HTTP handler
      // handle it since we want to stream the results. This action just ensures
      // the cleaning is properly initiated in the workflow.
      
      console.log(`Initiated cleaning for page ${pageId} with ${source} OCR`);
      
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