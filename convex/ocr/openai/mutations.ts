import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

export const saveCleanedResults = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    cleanedText: v.string(),
    cleaningStatus: v.literal("completed"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, args) => {

    
        // Insert new record
        // patch the results with index pdfId and source
        const existingJob = await ctx.db.query("openaiOcrResults")
        .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
        .filter((q) => q.eq(q.field("source"), args.source)).first();

        if (existingJob) {
          console.log("Patching existing record");
          await ctx.db.patch(existingJob._id, {
            pdfId: args.pdfId,
            cleanedText: args.cleanedText,
            cleaningStatus: args.cleaningStatus,
            processedAt: Date.now(),
          });
          
        }
        else {
          console.log("Inserting new record");
          await ctx.db.insert("openaiOcrResults", {
            pdfId: args.pdfId,
            cleanedText: args.cleanedText,
            cleaningStatus: args.cleaningStatus,
            processedAt: Date.now(),
            source: args.source,
          });
        }
        
        

  },
}); 


export const updateCleanedStatus = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    cleaningStatus: v.literal("started"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
    cleanedText: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if we already have results for this PDF
    const pdfJob = await ctx.db.get(args.pdfId);
    if (!pdfJob) {
        throw new Error("PDF is not ready for cleaning");
    }

    const existingJob = await ctx.db.query("openaiOcrResults")
    .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
    .filter((q) => q.eq(q.field("source"), args.source)).first();

    if (existingJob) {
      await ctx.db.patch(existingJob._id, {
        pdfId: args.pdfId,
        cleaningStatus: args.cleaningStatus,
        source: args.source,
        processedAt: Date.now(),
      });
    }


    else {
      await ctx.db.insert("openaiOcrResults", {
        pdfId: args.pdfId,
        cleaningStatus: args.cleaningStatus,
        source: args.source,
        processedAt: Date.now(),
        cleanedText: "",
      });
    }
    }

        
  }); 





  // convex/ocr/openai/mutations.ts - Add to existing file

export const updatePageCleaningStatus = internalMutation({
  args: {
    pageId: v.id("pages"),
    cleaningStatus: v.union(v.literal("started"), v.literal("completed")),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
    cleanedText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if we already have results for this page
    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new Error("Page not found");
    }

    const existingCleaned = await ctx.db.query("openaiCleanedPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .filter((q) => q.eq(q.field("source"), args.source))
      .first();

    if (existingCleaned) {
      const update: any = {
        cleaningStatus: args.cleaningStatus,
        processedAt: Date.now(),
      };
      
      if (args.cleanedText !== undefined) {
        update.cleanedText = args.cleanedText;
      }
      
      await ctx.db.patch(existingCleaned._id, update);
    } else {
      const insert: any = {
        pageId: args.pageId,
        cleaningStatus: args.cleaningStatus,
        source: args.source,
        processedAt: Date.now(),
        cleanedText: args.cleanedText || "",
      };
      
      await ctx.db.insert("openaiCleanedPage", insert);
    }
  },
});

export const savePageCleanedResults = internalMutation({
  args: {
    pageId: v.id("pages"),
    cleanedText: v.string(),
    cleaningStatus: v.literal("completed"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, args) => {
    const existingJob = await ctx.db.query("openaiCleanedPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .filter((q) => q.eq(q.field("source"), args.source))
      .first();

    if (existingJob) {
      await ctx.db.patch(existingJob._id, {
        cleanedText: args.cleanedText,
        cleaningStatus: args.cleaningStatus,
        processedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("openaiCleanedPage", {
        pageId: args.pageId,
        cleanedText: args.cleanedText,
        cleaningStatus: args.cleaningStatus,
        processedAt: Date.now(),
        source: args.source,
      });
    }
  },
});

// convex/ocr/openai/mutations.ts (update the startPageCleaning function)
export const startPageCleaning = internalMutation({
  args: { 
    pageId: v.id("pages"), 
    source: v.union(v.literal("gemini"), v.literal("replicate"))
  },
  handler: async (ctx, { pageId, source }) => {
    const existing = await ctx.db
      .query("openaiCleanedPage")
      .withIndex("by_page_source", q => 
        q.eq("pageId", pageId).eq("source", source))
      .unique();
    
    // Change this condition to handle the schema type
    if (existing && existing.cleaningStatus === "completed") {
      return "completed";
    }
    
    if (existing) {
      await ctx.db.patch(existing._id, { cleaningStatus: "started" }); // Use "started" instead of "processing"
    } else {
      await ctx.db.insert("openaiCleanedPage", {
        pageId,
        source,
        cleaningStatus: "started", // Use "started" instead of "processing"
        cleanedText: "",
        processedAt: Date.now(),
      });
    }
    
    return "started";
  },
});