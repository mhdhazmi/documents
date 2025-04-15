// convex/pdf/queries.ts
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
    if (args.replicateStatus) {
      pdfsQuery = pdfsQuery.filter((q) => q.eq(q.field("replicateStatus"), args.replicateStatus));
    }
    if (args.filenameContains) {

       console.warn("Filename filtering without a search index might be slow on large datasets.");
    }

    // Default ordering: Most recently uploaded first.

    return await pdfsQuery.order("desc").collect();
  },
});

// Get a single PDF document by its Convex ID (_id).
export const getPdf = query({
  args: {
    pdfId: v.id("pdfs"), 
  },
  handler: async (ctx, args) => {
    const pdf = await ctx.db.get(args.pdfId);
    if (!pdf) {

      console.warn(`PDF with ID ${args.pdfId} not found.`);
      return null;
    }
    return pdf;
  },
});