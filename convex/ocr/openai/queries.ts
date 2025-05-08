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







// convex/ocr/openai/queries.ts - Add to existing file

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
      return { page, cleanedText: null, cleaningStatus: null };
    }

    return {
      page,
      cleanedText: cleanedResult.cleanedText,
      cleaningStatus: cleanedResult.cleaningStatus,
    };
  },
});