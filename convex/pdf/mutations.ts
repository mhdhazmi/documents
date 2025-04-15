// convex/pdf/mutations.ts
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

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
      replicateStatus: "uploaded", // For Replicate

    });

    console.log(`Saved PDF metadata for ${args.filename}, ID: ${pdfId}`);
    return pdfId;
  },
});

// Internal mutation: Called by server-side actions (e.g., Gemini OCR action)
export const updatePdfStatus = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    status: v.union(v.literal("processing"), v.literal("processed"), v.literal("failed"), v.literal("uploaded")),
    processingError: v.optional(v.string()), 
  },
  handler: async (ctx, args) => {
    const updateFields: { status: string; processingError?: string } = {
      status: args.status,
    };

    if (args.status === "failed") {
      updateFields.processingError = args.processingError ?? "Unknown error";
    } else {
      updateFields.processingError = undefined;
    }

    await ctx.db.patch(args.pdfId, updateFields);

    console.log(`Updated Gemini PDF status for ${args.pdfId} to: ${args.status}`);
  },
});

// Internal mutation: Called by server-side actions (e.g., Replicate OCR action)
export const updateReplicateStatus = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    replicateStatus: v.union(v.literal("processing"), v.literal("processed"), v.literal("failed"), v.literal("uploaded")),
    replicateProcessingError: v.optional(v.string()), 
  },
  handler: async (ctx, args) => {
    // Prepare the fields to patch.
    const updateFields: { replicateStatus: string; replicateProcessingError?: string } = {
      replicateStatus: args.replicateStatus,
    };

    if (args.replicateStatus === "failed") {
      updateFields.replicateProcessingError = args.replicateProcessingError ?? "Unknown error";
    } else {
      updateFields.replicateProcessingError = undefined;
    }

    // Patch the existing PDF document.
    await ctx.db.patch(args.pdfId, updateFields);

    console.log(`Updated Replicate PDF status for ${args.pdfId} to: ${args.replicateStatus}`);
  },
});

// Public mutation that can be called from actions to update PDF status
export const updatePdfStatusFromAction = mutation({
  args: {
    pdfId: v.id("pdfs"),
    status: v.union(v.literal("processing"), v.literal("processed"), v.literal("failed"), v.literal("uploaded")),
    processingError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.pdf.mutations.updatePdfStatus, {
      pdfId: args.pdfId,
      status: args.status,
      processingError: args.processingError,
    });
  },
});

// Public mutation that can be called from actions to save OCR results
export const saveOcrResultsFromAction = mutation({
  args: {
    pdfId: v.id("pdfs"),
    fileId: v.string(),
    extractedText: v.string(),
    geminiModel: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.ocr.gemini.mutations.saveOcrResults, {
      pdfId: args.pdfId,
      fileId: args.fileId,
      extractedText: args.extractedText,
      geminiModel: args.geminiModel,
    });
  },
});