// convex/pdf/queries.ts
import { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { v } from "convex/values";

// Get a list of all uploaded PDFs, potentially filtered and ordered.
export const getPdfList = query({
  args: {
    status: v.optional(v.string()), 
    replicateStatus: v.optional(v.string()), 
    filenameContains: v.optional(v.string()), 

  },
  handler: async (ctx, args) => {
    let pdfsQuery = ctx.db.query("pdfs");

    // Apply filters dynamically based on provided arguments
    if (args.status) {
      pdfsQuery = pdfsQuery.filter((q) => q.eq(q.field("status"), args.status));
    }
    

    return await pdfsQuery.order("desc").collect();
  },
});

// Get a single PDF document by its Convex ID (_id).
export const getPdf = query({
  args: {
    pdfId: v.id("pdfs"), 
  },
  handler: async (ctx, args): Promise<Doc<"pdfs"> | null> => {
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {

      console.warn(`PDF with ID ${args.pdfId} not found.`);
      throw new Error(`PDF with ID ${args.pdfId} not found.`);
    }
    return pdf;
  },
});


export const getPdfPages = query({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args): Promise<Doc<"pages">[]> => {
    return await ctx.db
      .query("pages")
      .withIndex("byPdfIdAndPageNumber", (q) => q.eq("pdfId", args.pdfId))
      .collect();
  },
});

export const getPdfPage = query({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, args): Promise<Doc<"pages"> | null> => {
    return await ctx.db.get(args.pageId);
  },
});


export const getPageWithOcrResults = query({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, args): Promise<(Doc<"pages"> & {
    geminiOcr: Doc<"geminiPageOcr"> | null;
    replicateOcr: Doc<"replicatePageOcr"> | null;
    openaiCleaned: Doc<"openaiCleanedPage">[];
  }) | null> => {
    const page = await ctx.db.get(args.pageId);
    if (!page) {
      return null;
    }

    const geminiOcr = await ctx.db
      .query("geminiPageOcr")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();

    const replicateOcr = await ctx.db
      .query("replicatePageOcr")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();

    const openaiCleaned = await ctx.db
      .query("openaiCleanedPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .collect();

    return {
      ...page,
      geminiOcr,
      replicateOcr,
      openaiCleaned,
    };
  },
});