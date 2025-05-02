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
    const [ocrResults]  = await ctx.db
      .query("openaiOcrResults")
      .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
      .collect();

    const cleanedResults = ocrResults.cleanedText;



    // Return structured result
    return {
      cleanedResults,
    };
  },
}); 

export const getCleanedId = query({
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

  
    return await ctx.db
    .query("openaiOcrResults")
    .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
    .filter((q) => q.eq(q.field("source"), args.source))
    .collect();
  },
}); 