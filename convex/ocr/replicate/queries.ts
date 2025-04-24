// convex/ocr/replicate/queries.ts
import { query } from "../../_generated/server";
import { v } from "convex/values";

// Get Gemini OCR results specifically for a given PDF ID
export const getOcrResults = query({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args) => {
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {
      
      console.warn(`PDF not found in Replicate/getOcrResults query for ID: ${args.pdfId}`);
      return null; 
    }


    const ocrResults = await ctx.db
      .query("replicateOcrResults")
      .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
      .first(); 

    return {
      pdf, 
      ocrResults, 
    };
  },
});


export const getOcrStatus = query({
  args: {
    pdfId: v.id("replicateOcrResults"),
  },
  handler: async (ctx, args) => {
    const ocrResults = await ctx.db.get(args.pdfId);
    if (!ocrResults) {
     throw new Error("PDF not found in Replicate OCR for ID: ${args.pdfId}");
    }
    return {ocrStatus: ocrResults.ocrStatus};
  },

  
});


export const getOcrByPdfId = query({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args) => {
    return  await ctx.db
    .query("replicateOcrResults")
    .withIndex("by_pdf_id", q => q.eq("pdfId", args.pdfId))
    .collect();
  }
})