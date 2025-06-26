// convex/concatenate/queries.ts
import { Doc } from "../_generated/dataModel";
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

// openaiCleanedPage documents store the entire cleaned text in `fullText`.
// `cleanedText` remains as a backward-compatible snippet.
interface CleanedPage extends Doc<"openaiCleanedPage"> {
  fullText?: string;
}

export const areAllPagesComplete = internalQuery({
  args: {
    pdfId: v.id("pdfs"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, args) => {
    // 1. Get all pages for this PDF
    const pages = await ctx.db
      .query("pages")
      .withIndex("byPdfId", (q) => q.eq("pdfId", args.pdfId))
      .collect();

    if (pages.length === 0) {
      return false;
    }

    // 2. Check if every page has cleaned results for the specified source
    for (const page of pages) {
      const cleaned: CleanedPage | null = await ctx.db
        .query("openaiCleanedPage")
        .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
        .filter(
          (q) =>
            q.eq(q.field("source"), args.source) &&
            q.eq(q.field("cleaningStatus"), "completed")
        )
        .first();

      // If any page doesn't have complete cleaned results, return false
      if (!cleaned) {
        return false;
      }
    }

    // All pages have completed cleaned results
    return true;
  },
});

export const getConcatenatedText = internalQuery({
  args: {
    pdfId: v.id("pdfs"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, args) => {
    // 1. Get all pages for this PDF in order
    const pages = await ctx.db
      .query("pages")
      .withIndex("byPdfIdAndPageNumber", (q) => q.eq("pdfId", args.pdfId))
      .collect();

    if (pages.length === 0) {
      return "";
    }

    // 2. Get the cleaned text for each page in order
    const pageTexts: string[] = [];

    for (const page of pages) {
      const cleaned: CleanedPage | null = await ctx.db
        .query("openaiCleanedPage")
        .withIndex("by_page_id", (q) => q.eq("pageId", page._id))
        .filter(
          (q) =>
            q.eq(q.field("source"), args.source) &&
            q.eq(q.field("cleaningStatus"), "completed")
        )
        .first();

      if (cleaned?.cleanedText) {
        // fullText contains the entire cleaned text. cleanedText is a short
        // snippet stored for backward compatibility.
        pageTexts.push(
          `--- PAGE ${page.pageNumber} ---\n${cleaned.fullText ?? cleaned.cleanedText}`
        );
      } else {
        pageTexts.push(`--- PAGE ${page.pageNumber} ---\n[No text available]`);
      }
    }

    // 3. Join all page texts with double newlines
    return pageTexts.join("\n\n");
  },
});
