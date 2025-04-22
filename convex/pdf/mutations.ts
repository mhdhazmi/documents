// convex/pdf/mutations.ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";

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
    return pdfId;
  },
});

