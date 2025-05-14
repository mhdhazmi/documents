// convex/pdf/queries.ts
import { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { PdfPageInfo, OcrStatus } from "../../src/app/pdf/types";
import { asyncMap } from "modern-async";

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
  handler: async (
    ctx,
    args
  ): Promise<
    | (Doc<"pages"> & {
        geminiOcr: Doc<"geminiPageOcr"> | null;
        replicateOcr: Doc<"replicatePageOcr"> | null;
        openaiCleaned: Doc<"openaiCleanedPage">[];
      })
    | null
  > => {
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

// NEW: Get all pages for a PDF with status and snippet information
export const getPagesByPdf = query({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args): Promise<PdfPageInfo[]> => {
    // Check if PDF exists
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {
      throw new ConvexError("PDF not found");
    }

    // Get all pages for this PDF, sorted by page number
    const pages = await ctx.db
      .query("pages")
      .withIndex("byPdfIdAndPageNumber", (q) => q.eq("pdfId", args.pdfId))
      .collect();

    // Map each page to PdfPageInfo
    const pageInfos: PdfPageInfo[] = await Promise.all(
      pages.map(async (page): Promise<PdfPageInfo> => {
        // Get Gemini OCR status
        const geminiOcr = await ctx.db
          .query("geminiPageOcr")
          .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
          .first();

        // Get Replicate OCR status
        const replicateOcr = await ctx.db
          .query("replicatePageOcr")
          .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
          .first();

        // Get cleaned text (prioritize OpenAI cleaned, fallback to raw OCR)
        let cleanedText: string | null = null;

        // First try OpenAI cleaned text
        const openaiCleaned = await ctx.db
          .query("openaiCleanedPage")
          .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
          .filter((q) => q.eq(q.field("cleaningStatus"), "completed"))
          .first();

        if (openaiCleaned?.cleanedText) {
          cleanedText = openaiCleaned.cleanedText;
        } else {
          // Fallback to raw OCR text from either source
          if (geminiOcr?.extractedText) {
            cleanedText = geminiOcr.extractedText;
          } else if (replicateOcr?.extractedText) {
            cleanedText = replicateOcr.extractedText;
          }
        }

        // Create snippet (first 160 characters)
        let cleanedSnippet: string | null = null;
        if (cleanedText && cleanedText.length > 0) {
          cleanedSnippet =
            cleanedText.length > 160
              ? `${cleanedText.slice(0, 160)}…`
              : cleanedText;
        }

        return {
          pageId: page._id,
          pageNumber: page.pageNumber,
          geminiStatus: (geminiOcr?.ocrStatus as OcrStatus) || "pending",
          replicateStatus: (replicateOcr?.ocrStatus as OcrStatus) || "pending",
          cleanedSnippet,
        };
      })
    );

    // Return pages sorted by page number
    return pageInfos.sort((a, b) => a.pageNumber - b.pageNumber);
  },
});

export const getPdfByIds = query({
  args: {
    pdfIds: v.array(v.id("pdfs")),
  },
  handler: async (ctx, args) => {
    return await asyncMap(args.pdfIds, async (pdfId) => {
      const pdf = await ctx.db.get(pdfId);
      if (!pdf) {
        console.warn(`PDF with ID ${pdfId} not found`);
        return null;
      }
      return pdf;
    }).then((results) => results.filter((pdf) => pdf !== null));
  },
});

// Get processed pages with cleaned text for a PDF
export const getProcessedPagesForPdf = query({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args) => {
    // Get all pages for this PDF in order
    const pages = await ctx.db
      .query("pages")
      .withIndex("byPdfIdAndPageNumber", (q) => q.eq("pdfId", args.pdfId))
      .collect();
    
    // For each page, get the cleaned text
    const pagesWithText = await asyncMap(pages, async (page) => {
      // First, check if we have cleaned text from OpenAI
      const openaiCleaned = await ctx.db
        .query("openaiCleanedPage")
        .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
        .filter((q) => q.eq(q.field("cleaningStatus"), "completed"))
        .first();
      
      if (openaiCleaned?.cleanedText) {
        return {
          pageId: page._id,
          pageNumber: page.pageNumber,
          cleanedText: openaiCleaned.cleanedText,
        };
      }
      
      // If no OpenAI cleaned text, try Gemini
      const geminiOcr = await ctx.db
        .query("geminiPageOcr")
        .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
        .filter((q) => q.eq(q.field("ocrStatus"), "completed"))
        .first();
      
      if (geminiOcr?.extractedText) {
        return {
          pageId: page._id,
          pageNumber: page.pageNumber,
          cleanedText: geminiOcr.extractedText,
        };
      }
      
      // If no Gemini, try Replicate
      const replicateOcr = await ctx.db
        .query("replicatePageOcr")
        .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
        .filter((q) => q.eq(q.field("ocrStatus"), "completed"))
        .first();
      
      if (replicateOcr?.extractedText) {
        return {
          pageId: page._id,
          pageNumber: page.pageNumber,
          cleanedText: replicateOcr.extractedText,
        };
      }
      
      // If no text found, return with empty text
      return {
        pageId: page._id,
        pageNumber: page.pageNumber,
        cleanedText: "",
      };
    });
    
    // Sort by page number and filter out empty pages
    return pagesWithText
      .filter(page => page.cleanedText.trim().length > 0)
      .sort((a, b) => a.pageNumber - b.pageNumber);
  },
});

// Get PDF summary
export const getPdfSummary = query({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args) => {
    const summary = await ctx.db
      .query("pdfSummaries")
      .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
      .first();
    
    return summary;
  },
});
