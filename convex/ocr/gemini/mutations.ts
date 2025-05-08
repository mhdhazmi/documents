// convex/ocr/gemini/mutations.ts
import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";


export const updateOcrStatus = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    ocrStatus: v.union(v.literal("processing"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const [row] = await ctx.db
      .query("geminiOcrResults")
      .withIndex("by_pdf_id", q => q.eq("pdfId", args.pdfId))
      .collect();
    if (row) {
      // update it
      await ctx.db.patch(row._id, {
        ocrStatus: args.ocrStatus,
        processedAt: Date.now(),
      });
    } else {
      // or insert a new one
      await ctx.db.insert("geminiOcrResults", {
        pdfId: args.pdfId,
        ocrStatus: args.ocrStatus,
        processedAt: Date.now(),
      });
    }
  },
});


export const updateOcrResutls = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    extractedText: v.string(),
    ocrStatus: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {

    const [row] = await ctx.db
      .query("geminiOcrResults")
      .withIndex("by_pdf_id", q => q.eq("pdfId", args.pdfId))
      .collect();

    if (row) {
    await ctx.db.patch(row._id, {
      extractedText: args.extractedText,
      ocrStatus: "completed",
    });
    } else {
      throw new Error("Gemini OCR results not found for PDF ID: " + args.pdfId);
    }
  },
});

// convex/ocr/gemini/mutations.ts - Add to existing file

export const updatePageOcrStatus = internalMutation({
  args: {
    pageId: v.id("pages"),
    ocrStatus: v.union(v.literal("processing"), v.literal("failed")),
  },
  handler: async (ctx, args): Promise<void> => {
    const row = await ctx.db
      .query("geminiPageOcr")
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
      await ctx.db.insert("geminiPageOcr", {
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
      .query("geminiPageOcr")
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
      await ctx.db.insert("geminiPageOcr", {
        pageId: args.pageId,
        extractedText: args.extractedText,
        ocrStatus: "completed",
        processedAt: Date.now(),
      });
    }
  },
});








  
