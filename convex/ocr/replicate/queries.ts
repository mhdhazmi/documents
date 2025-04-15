// convex/ocr/replicate/queries.ts
import { query } from  "../../_generated/server";
import { v } from "convex/values";

// Get Replicate OCR results specifically for a given PDF ID
export const getOcrResults = query({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch the PDF document itself (optional, provides context)
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {
      console.warn(`PDF not found in replicate/getOcrResults query for ID: ${args.pdfId}`);
      return null; // PDF must exist to have results
    }

    // 2. Fetch the corresponding Replicate OCR results
    const ocrResults = await ctx.db
      .query("replicateOcrResults")
      .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
      .first(); 

    // 3. Return structured result
    return {
      pdf, 
      ocrResults, 
    };
  },
});