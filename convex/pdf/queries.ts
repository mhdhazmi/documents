// convex/pdf/queries.ts
import { Doc, Id } from "../_generated/dataModel";
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

// Get all pages for a PDF with status and snippet information - optimized to avoid N+1 queries
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

    // 1. Get all pages for this PDF, sorted by page number
    const pages = await ctx.db
      .query("pages")
      .withIndex("byPdfIdAndPageNumber", (q) => q.eq("pdfId", args.pdfId))
      .collect();
    
    if (pages.length === 0) {
      return [];
    }
    
    // Create an array of all page IDs
    const pageIds = pages.map(page => page._id);
    
    // 2. Batch fetch all OCR results for all pages in this PDF
    
    // 2.1 Fetch all Gemini OCR results for these pages
    const allGeminiOcrResults = await Promise.all(
      pageIds.map(pageId => 
        ctx.db.query("geminiPageOcr")
          .withIndex("by_page_id", q => q.eq("pageId", pageId))
          .first()
      )
    ).then(results => results.filter(result => result !== null) as Doc<"geminiPageOcr">[]);
    
    // 2.2 Fetch all Replicate OCR results for these pages
    const allReplicateOcrResults = await Promise.all(
      pageIds.map(pageId => 
        ctx.db.query("replicatePageOcr")
          .withIndex("by_page_id", q => q.eq("pageId", pageId))
          .first()
      )
    ).then(results => results.filter(result => result !== null) as Doc<"replicatePageOcr">[]);
    
    // 2.3 Fetch all OpenAI cleaned results for these pages
    const allOpenaiCleanedResults = await Promise.all(
      pageIds.map(pageId => 
        ctx.db.query("openaiCleanedPage")
          .withIndex("by_page_id", q => q.eq("pageId", pageId))
          .filter(q => q.eq(q.field("cleaningStatus"), "completed"))
          .first()
      )
    ).then(results => results.filter(result => result !== null) as Doc<"openaiCleanedPage">[]);
    
    // 3. Create lookup maps for efficient access by pageId
    const geminiOcrMap = new Map(
      allGeminiOcrResults.map(result => [result.pageId.toString(), result])
    );
    
    const replicateOcrMap = new Map(
      allReplicateOcrResults.map(result => [result.pageId.toString(), result])
    );
    
    const openaiCleanedMap = new Map(
      allOpenaiCleanedResults.map(result => [result.pageId.toString(), result])
    );
    
    // 4. Map each page to PdfPageInfo using the lookup maps instead of individual queries
    const pageInfos: PdfPageInfo[] = pages.map((page): PdfPageInfo => {
      const pageIdStr = page._id.toString();
      const geminiOcr = geminiOcrMap.get(pageIdStr);
      const replicateOcr = replicateOcrMap.get(pageIdStr);
      const openaiCleaned = openaiCleanedMap.get(pageIdStr);
      
      // Get cleaned text (prioritize OpenAI cleaned, fallback to raw OCR)
      let cleanedText: string | null = null;
      let fullText: string | null = null;
      
      if (openaiCleaned) {
        // If we have OpenAI cleaned results
        if (openaiCleaned.fullText) {
          // Use the fullText field if available
          fullText = openaiCleaned.fullText;
          cleanedText = openaiCleaned.cleanedText;
        } else if (openaiCleaned.cleanedText) {
          // Fall back to cleanedText for backward compatibility
          cleanedText = openaiCleaned.cleanedText;
        }
      } else if (geminiOcr?.extractedText) {
        cleanedText = geminiOcr.extractedText;
      } else if (replicateOcr?.extractedText) {
        cleanedText = replicateOcr.extractedText;
      }
      
      // Create snippet if needed
      let cleanedSnippet: string | null = null;
      if (cleanedText && cleanedText.length > 0) {
        // If cleanedText is already a snippet (after our schema change), use it directly
        if (cleanedText.endsWith('…')) {
          cleanedSnippet = cleanedText;
        } else {
          // Otherwise create a snippet
          cleanedSnippet =
            cleanedText.length > 160
              ? `${cleanedText.slice(0, 160)}…`
              : cleanedText;
        }
      }
      
      return {
        pageId: page._id,
        pageNumber: page.pageNumber,
        geminiStatus: (geminiOcr?.ocrStatus as OcrStatus) || "pending",
        replicateStatus: (replicateOcr?.ocrStatus as OcrStatus) || "pending",
        cleanedSnippet,
        fullText, // Include fullText in the response
      };
    });
    
    // Return pages sorted by page number (should already be sorted, but just to be safe)
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

// Get processed pages with cleaned text for a PDF - optimized to avoid N+1 queries
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
    
    if (pages.length === 0) {
      return [];
    }
    
    // Create an array of all page IDs
    const pageIds = pages.map(page => page._id);
    
    // Batch fetch all OCR results in parallel
    const [allOpenaiCleaned, allGeminiOcr, allReplicateOcr] = await Promise.all([
      // OpenAI cleaned results
      Promise.all(
        pageIds.map(pageId => 
          ctx.db.query("openaiCleanedPage")
            .withIndex("by_page_id", q => q.eq("pageId", pageId))
            .filter((q) => q.eq(q.field("cleaningStatus"), "completed"))
            .first()
        )
      ).then(results => results.filter(result => result !== null) as Doc<"openaiCleanedPage">[]),
      
      // Gemini OCR results
      Promise.all(
        pageIds.map(pageId => 
          ctx.db.query("geminiPageOcr")
            .withIndex("by_page_id", q => q.eq("pageId", pageId))
            .filter((q) => q.eq(q.field("ocrStatus"), "completed"))
            .first()
        )
      ).then(results => results.filter(result => result !== null) as Doc<"geminiPageOcr">[]),
      
      // Replicate OCR results
      Promise.all(
        pageIds.map(pageId => 
          ctx.db.query("replicatePageOcr")
            .withIndex("by_page_id", q => q.eq("pageId", pageId))
            .filter((q) => q.eq(q.field("ocrStatus"), "completed"))
            .first()
        )
      ).then(results => results.filter(result => result !== null) as Doc<"replicatePageOcr">[])
    ]);
    
    // Create lookup maps for efficient access
    const openaiCleanedMap = new Map(
      allOpenaiCleaned.map(result => [
        result.pageId.toString(), 
        { 
          cleanedText: result.cleanedText || "",
          fullText: result.fullText || result.cleanedText || ""  // Prefer fullText, fall back to cleanedText
        }
      ])
    );
    
    const geminiOcrMap = new Map(
      allGeminiOcr.map(result => [result.pageId.toString(), result.extractedText || ""])
    );
    
    const replicateOcrMap = new Map(
      allReplicateOcr.map(result => [result.pageId.toString(), result.extractedText || ""])
    );
    
    // Process pages using the lookup maps
    const pagesWithText = pages.map(page => {
      const pageIdStr = page._id.toString();
      
      // Priority: OpenAI cleaned > Gemini OCR > Replicate OCR
      let cleanedText = "";
      
      if (openaiCleanedMap.has(pageIdStr)) {
        // Prefer the fullText if available
        const openaiData = openaiCleanedMap.get(pageIdStr)!;
        cleanedText = openaiData.fullText || openaiData.cleanedText;
      } else if (geminiOcrMap.has(pageIdStr)) {
        cleanedText = geminiOcrMap.get(pageIdStr) || "";
      } else if (replicateOcrMap.has(pageIdStr)) {
        cleanedText = replicateOcrMap.get(pageIdStr) || "";
      }
      
      return {
        pageId: page._id,
        pageNumber: page.pageNumber,
        cleanedText,
      };
    });
    
    // Filter out empty pages and sort by page number
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

// For debugging and performance benchmarking only
export const benchmarkPageQueries = query({
  args: {
    pdfId: v.id("pdfs"),
    mode: v.union(v.literal("legacy"), v.literal("optimized")),
  },
  handler: async (ctx, args) => {
    // Start timer
    const startTime = Date.now();
    let queryCount = 0;
    
    // Get pages
    const pages = await ctx.db
      .query("pages")
      .withIndex("byPdfIdAndPageNumber", (q) => q.eq("pdfId", args.pdfId))
      .collect();
    queryCount++;
    
    if (pages.length === 0) {
      return { 
        status: "empty", 
        queryCount, 
        pageCount: 0,
        timeMs: Date.now() - startTime 
      };
    }
    
    if (args.mode === "legacy") {
      // Legacy N+1 implementation (modified to just count queries, not actually build the result)
      for (const page of pages) {
        // For Gemini OCR status
        await ctx.db
          .query("geminiPageOcr")
          .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
          .first();
        queryCount++;
        
        // For Replicate OCR status
        await ctx.db
          .query("replicatePageOcr")
          .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
          .first();
        queryCount++;
        
        // For OpenAI cleaned text
        await ctx.db
          .query("openaiCleanedPage")
          .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
          .filter((q) => q.eq(q.field("cleaningStatus"), "completed"))
          .first();
        queryCount++;
      }
    } else {
      // Optimized batched queries implementation
      const pageIds = pages.map(page => page._id);
      
      // Batch query for Gemini OCR
      await Promise.all(
        pageIds.map(pageId => 
          ctx.db.query("geminiPageOcr")
            .withIndex("by_page_id", q => q.eq("pageId", pageId))
            .first()
        )
      );
      queryCount += pageIds.length;
      
      // Batch query for Replicate OCR
      await Promise.all(
        pageIds.map(pageId => 
          ctx.db.query("replicatePageOcr")
            .withIndex("by_page_id", q => q.eq("pageId", pageId))
            .first()
        )
      );
      queryCount += pageIds.length;
      
      // Batch query for OpenAI cleaned
      await Promise.all(
        pageIds.map(pageId => 
          ctx.db.query("openaiCleanedPage")
            .withIndex("by_page_id", q => q.eq("pageId", pageId))
            .filter((q) => q.eq(q.field("cleaningStatus"), "completed"))
            .first()
        )
      );
      queryCount += pageIds.length;
    }
    
    const endTime = Date.now();
    
    return {
      status: "success",
      mode: args.mode,
      pageCount: pages.length,
      queryCount,
      timeMs: endTime - startTime,
      queriesPerPage: queryCount / pages.length
    };
  },
});
