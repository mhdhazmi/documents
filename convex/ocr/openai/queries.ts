import { query } from "../../_generated/server";
import { v } from "convex/values";

// Get OpenAI cleaned OCR results for a given PDF
export const getCleanedResults = query({
  args: {
    pdfId: v.id("pdfs"),
    source: v.optional(v.union(v.literal("gemini"), v.literal("replicate"))),
  },
  handler: async (ctx, args) => {
    // Get the PDF document
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {
      console.warn(`PDF not found in openai/getCleanedResults query for ID: ${args.pdfId}`);
      return null;
    }

    // Build the query
    let q = ctx.db
      .query("openaiOcrResults")
      .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId));


    
    // If source is specified, filter by it
    if (args.source) {
      q = q.filter((q) => q.eq(q.field("originalSource"), args.source));
    }

    // Get all matching results
    const ocrResults = await q.collect();

    // Return structured result
    return {
      pdf,
      ocrResults,
    };
  },
}); 