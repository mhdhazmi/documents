// convex/ocr/replicate/mutations.ts
import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";


export const updateOcrStatus = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    ocrStatus: v.union(v.literal("processing"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const [row] = await ctx.db
      .query("replicateOcrResults")
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
      await ctx.db.insert("replicateOcrResults", {
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
  handler: async (ctx, args) => {

    const [row] = await ctx.db
      .query("replicateOcrResults")
      .withIndex("by_pdf_id", q => q.eq("pdfId", args.pdfId))
      .collect();

    if (row) {
    await ctx.db.patch(row._id, {
      extractedText: args.extractedText,
      ocrStatus: "completed",
    });
    } else {
      throw new Error("Replicate OCR results not found for PDF ID: " + args.pdfId);
    }
  },
});
