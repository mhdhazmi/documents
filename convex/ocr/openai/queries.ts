import { query } from "../../_generated/server";
import { v } from "convex/values";

// Legacy PDF-level OCR queries have been removed
// These included getCleanedResults and getCleanedId
// which referenced the removed openaiOcrResults table

// Current page-level OCR queries

export const getPageCleanedResults = query({
  args: {
    pageId: v.id("pages"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, args) => {
    // Get the page
    const page = await ctx.db.get(args.pageId);
    if (!page) {
      console.warn(`Page not found in openai/getPageCleanedResults query for ID: ${args.pageId}`);
      return null;
    }

    // Query for cleaned results
    const cleanedResult = await ctx.db
      .query("openaiCleanedPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .filter((q) => q.eq(q.field("source"), args.source))
      .first();

    if (!cleanedResult) {
      return { page, cleanedText: null, cleaningStatus: null, fullText: null };
    }

    return {
      page,
      cleanedText: cleanedResult.cleanedText,
      fullText: cleanedResult.fullText || cleanedResult.cleanedText, // Return fullText if available, fallback to cleanedText
      cleaningStatus: cleanedResult.cleaningStatus,
    };
  },
});