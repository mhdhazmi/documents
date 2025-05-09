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


    const ocrResults = await ctx.db
      .query("geminiOcrResults")
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
    pdfId: v.id("geminiOcrResults"),
  },
  handler: async (ctx, args) => {
    const ocrResults = await ctx.db.get(args.pdfId);
    if (!ocrResults) {
     throw new Error("PDF not found in Gemini OCR for ID: ${args.pdfId}");
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
    .query("geminiOcrResults")
    .withIndex("by_pdf_id", q => q.eq("pdfId", args.pdfId))
    .collect();
  }
})


export const getPageOcrResults = query({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) {
      console.warn(`Page not found in gemini/getPageOcrResults query for ID: ${args.pageId}`);
      return null;
    }

    const ocrResults = await ctx.db
      .query("geminiPageOcr")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();

    return {
      page,
      ocrResults,
    };
  },
});

export const getPageOcrStatus = query({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, args) => {
    const ocrResults = await ctx.db
      .query("geminiPageOcr")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();
      
    if (!ocrResults) {
      return { ocrStatus: null };
    }
    
    return { ocrStatus: ocrResults.ocrStatus };
  },
});