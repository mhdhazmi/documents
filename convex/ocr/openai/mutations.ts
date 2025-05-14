import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

// Legacy PDF-level OCR functions removed (saveCleanedResults, updateCleanedStatus)
// These functions referenced the removed openaiOcrResults table

// convex/ocr/openai/mutations.ts - Current implementation

export const updatePageCleaningStatus = internalMutation({
  args: {
    pageId: v.id("pages"),
    cleaningStatus: v.union(v.literal("started"), v.literal("completed")),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
    cleanedText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if we already have results for this page
    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    const existingCleaned = await ctx.db.query("openaiCleanedPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .filter((q) => q.eq(q.field("source"), args.source))
      .first();

    if (existingCleaned) {
      const update: any = {
        cleaningStatus: args.cleaningStatus,
        processedAt: Date.now(),
      };
      
      if (args.cleanedText !== undefined) {
        update.cleanedText = args.cleanedText;
      }
      
      await ctx.db.patch(existingCleaned._id, update);
    } else {
      const insert: any = {
        pageId: args.pageId,
        cleaningStatus: args.cleaningStatus,
        source: args.source,
        processedAt: Date.now(),
        cleanedText: args.cleanedText || "",
      };
      
      await ctx.db.insert("openaiCleanedPage", insert);
    }
  },
});

export const savePageCleanedResults = internalMutation({
  args: {
    pageId: v.id("pages"),
    cleanedText: v.string(),
    cleaningStatus: v.literal("completed"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, args) => {
    const existingJob = await ctx.db.query("openaiCleanedPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .filter((q) => q.eq(q.field("source"), args.source))
      .first();

    // Create a snippet for backwards compatibility
    const cleanedSnippet = args.cleanedText.substring(0, 160) + (args.cleanedText.length > 160 ? '…' : '');

    if (existingJob) {
      await ctx.db.patch(existingJob._id, {
        cleanedText: cleanedSnippet,    // Store only the snippet in cleanedText
        fullText: args.cleanedText,     // Store full text in the new field
        cleaningStatus: args.cleaningStatus,
        processedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("openaiCleanedPage", {
        pageId: args.pageId,
        cleanedText: cleanedSnippet,    // Store only the snippet in cleanedText
        fullText: args.cleanedText,     // Store full text in the new field
        cleaningStatus: args.cleaningStatus,
        processedAt: Date.now(),
        source: args.source,
      });
    }
  },
});

// convex/ocr/openai/mutations.ts (update the startPageCleaning function)
export const startPageCleaning = internalMutation({
  args: { 
    pageId: v.id("pages"), 
    source: v.union(v.literal("gemini"), v.literal("replicate"))
  },
  handler: async (ctx, { pageId, source }) => {
    const existing = await ctx.db
      .query("openaiCleanedPage")
      .withIndex("by_page_source", q => 
        q.eq("pageId", pageId).eq("source", source))
      .unique();
    
    // Change this condition to handle the schema type
    if (existing && existing.cleaningStatus === "completed") {
      return "completed";
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, { cleaningStatus: "started" }); // Use "started" instead of "processing"
    } else {
      await ctx.db.insert("openaiCleanedPage", {
        pageId,
        source,
        cleaningStatus: "started", // Use "started" instead of "processing"
        cleanedText: "",
        processedAt: Date.now(),
      });
    }
    
    return "started";
  },
});