// convex/ocr/replicate/mutations.ts
import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

// Legacy PDF-level OCR functions removed (updateOcrStatus, updateOcrResutls)
// These functions referenced the removed replicateOcrResults table

// convex/ocr/replicate/mutations.ts - Current implementation

export const updatePageOcrStatus = internalMutation({
  args: {
    pageId: v.id("pages"),
    ocrStatus: v.union(v.literal("processing"), v.literal("failed")),
  },
  handler: async (ctx, args): Promise<void> => {
    const row = await ctx.db
      .query("replicatePageOcr")
      .withIndex("by_page_id", q => q.eq("pageId", args.pageId))
      .first();
      
    if (row) {
      // update existing row
      await ctx.db.patch(row._id, {
        ocrStatus: args.ocrStatus,
        processedAt: Date.now(),
      });
    } else {
      // insert a new row
      await ctx.db.insert("replicatePageOcr", {
        pageId: args.pageId,
        ocrStatus: args.ocrStatus,
        processedAt: Date.now(),
      });
    }
  },
});

export const updatePageOcrResults = internalMutation({
  args: {
    pageId: v.id("pages"),
    extractedText: v.string(),
    ocrStatus: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const row = await ctx.db
      .query("replicatePageOcr")
      .withIndex("by_page_id", q => q.eq("pageId", args.pageId))
      .first();

    if (row) {
      await ctx.db.patch(row._id, {
        extractedText: args.extractedText,
        ocrStatus: "completed",
        processedAt: Date.now(),
      });
    } else {
      // In case the row doesn't exist yet
      await ctx.db.insert("replicatePageOcr", {
        pageId: args.pageId,
        extractedText: args.extractedText,
        ocrStatus: "completed",
        processedAt: Date.now(),
      });
    }
  },
});