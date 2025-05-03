import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

export const saveCleanedResults = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    cleanedText: v.string(),
    englishText: v.optional(v.string()),
    arabicKeywords: v.optional(v.array(v.string())),
    englishKeywords: v.optional(v.array(v.string())),
    cleaningStatus: v.literal("completed"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, args) => {
    // Check if we already have a record for this PDF + source
    const existingJob = await ctx.db.query("openaiOcrResults")
      .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
      .filter((q) => q.eq(q.field("source"), args.source)).first();

    if (existingJob) {
      console.log("Patching existing record");
      await ctx.db.patch(existingJob._id, {
        pdfId: args.pdfId,
        cleanedText: args.cleanedText,
        englishText: args.englishText,
        arabicKeywords: args.arabicKeywords,
        englishKeywords: args.englishKeywords,
        cleaningStatus: args.cleaningStatus,
        processedAt: Date.now(),
      });
    }
    else {
      console.log("Inserting new record");
      await ctx.db.insert("openaiOcrResults", {
        pdfId: args.pdfId,
        cleanedText: args.cleanedText,
        englishText: args.englishText,
        arabicKeywords: args.arabicKeywords,
        englishKeywords: args.englishKeywords,
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
    // Check if PDF exists
    const pdfJob = await ctx.db.get(args.pdfId);
    if (!pdfJob) {
        throw new Error("PDF is not ready for cleaning");
    }

    // Check if we already have a record for this PDF + source
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