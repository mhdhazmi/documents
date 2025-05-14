// convex/ocr/gemini/queries.ts
import { query } from "../../_generated/server";
import { v } from "convex/values";

// Legacy whole-PDF queries have been removed
// These included getOcrResults, getOcrStatus, and getOcrByPdfId
// which referenced the removed geminiOcrResults table

// Current page-level OCR queries
export const getPageOcrResults = query({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) {
      console.warn(`Page not found in gemini/getPageOcrResults query for ID: ${args.pageId}`);
      return null;
    }

    const ocrResults = await ctx.db
      .query("geminiPageOcr")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();

    return {
      page,
      ocrResults,
    };
  },
});

export const getPageOcrStatus = query({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, args) => {
    const ocrResults = await ctx.db
      .query("geminiPageOcr")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();
      
    if (!ocrResults) {
      return { ocrStatus: null };
    }
    
    return { ocrStatus: ocrResults.ocrStatus };
  },
});