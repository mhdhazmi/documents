// convex/pdf/mutations.ts
import { internal } from "../_generated/api";
import { action, internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { workflow } from "../workflow";
import { Id } from "../_generated/dataModel";
import { openai } from "../config";


// Page by page mutations
// Public mutation: Called by the client after successfully uploading a file to storage.


export const savePdfMetadata = mutation({
  args: {
    fileId: v.string(),
    filename: v.string(),
    fileSize: v.number(),
    pageCount: v.number(),
  },
  handler: async (ctx, args) => {
 

    // Insert a new document into the 'pdfs' table
    const pdfId = await ctx.db.insert("pdfs", {
      fileId: args.fileId , // Store as StorageId type in DB
      filename: args.filename,
      fileSize: args.fileSize,
      pageCount: args.pageCount,
      uploadedAt: Date.now(), 
      status: "uploaded",


    });

    console.log(`Saved PDF metadata for ${args.filename}, ID: ${pdfId}`);
    await workflow.start(
      ctx,
      internal.workflow.ocrWorkflow.ocrWorkflow,
      { pdfId }
    );
    return pdfId;
  },
});







// Add this to the existing mutations file
export const savePdfPage = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    pageNumber: v.number(),
    fileId: v.string(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"pages">> => {
    return await ctx.db.insert("pages", {
      pdfId: args.pdfId,
      pageNumber: args.pageNumber,
      fileId: args.fileId,
      width: args.width,
      height: args.height,
      createdAt: Date.now(),
    });
  },
});

export const updatePdfPageCount = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    pageCount: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {
      throw new Error(`PDF not found for ID: ${args.pdfId}`);
    }
    
    await ctx.db.patch(args.pdfId, {
      pageCount: args.pageCount,
    });
  },
});

export const updateSummary = internalMutation({
  args: {
    summaryId: v.id("pdfSummaries"),
    summary: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    )),
  },
  handler: async (ctx, { summaryId, summary, status }) => {
    const updateData: any = {};
    
    if (summary !== undefined) {
      updateData.summary = summary;
    }
    
    if (status !== undefined) {
      updateData.status = status;
    }
    
    if (Object.keys(updateData).length > 0) {
      updateData.processedAt = Date.now();
      await ctx.db.patch(summaryId, updateData);
    }
  },
});

export const updateSummaryStatus = internalMutation({
  args: {
    summaryId: v.id("pdfSummaries"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, { summaryId, status }) => {
    await ctx.db.patch(summaryId, {
      status,
      processedAt: Date.now(),
    });
  },
});

export const generatePdfSummary = mutation({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, { pdfId }) => {
    // Check if we already have a summary for this PDF
    const existingSummary = await ctx.db
      .query("pdfSummaries")
      .withIndex("by_pdf_id", (q) => q.eq("pdfId", pdfId))
      .first();

    if (existingSummary && existingSummary.status === "completed") {
      return existingSummary._id;
    }

    // Create or update the summary record with "processing" status
    let summaryId;
    if (existingSummary) {
      summaryId = existingSummary._id;
      await ctx.db.patch(summaryId, {
        status: "processing",
        processedAt: Date.now(),
      });
    } else {
      summaryId = await ctx.db.insert("pdfSummaries", {
        pdfId,
        summary: "",
        processedAt: Date.now(),
        status: "processing",
      });
    }

    // Schedule summary generation task
    await ctx.scheduler.runAfter(0, internal.pdf.actions.generateSummary, {
      pdfId,
      summaryId,
    });

    return summaryId;
  },
});



