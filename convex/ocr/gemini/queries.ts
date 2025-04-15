// convex/ocr/gemini/queries.ts
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
      
      console.warn(`PDF not found in gemini/getOcrResults query for ID: ${args.pdfId}`);
      return null; 
    }

    // 2. Fetch the corresponding Gemini OCR results

    const ocrResults = await ctx.db
      .query("geminiOcrResults")
      .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
      .first(); 

    // 3. Return a structured result including both PDF info and OCR results (if found)
    return {
      pdf, 
      ocrResults, 
    };
  },
});