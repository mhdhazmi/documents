// convex/pdf/mutations.ts
import { internal } from "../_generated/api";
import { action, internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { workflow } from "../workflow";
import { Id } from "../_generated/dataModel";


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




