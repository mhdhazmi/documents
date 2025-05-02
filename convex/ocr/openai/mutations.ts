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


