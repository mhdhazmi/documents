// convex/concatenate/mutations.ts
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const saveConcatenatedText = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if we already have concatenated results for this PDF and source
    const existing = await ctx.db
      .query("openaiOcrResults")
      .withIndex("by_pdf_id", (q) => q.eq("pdfId", args.pdfId))
      .filter((q) => q.eq(q.field("source"), args.source))
      .first();
    
    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        cleanedText: args.text,
        cleaningStatus: "completed",
        processedAt: Date.now(),
      });
    } else {
      // Create new record
      await ctx.db.insert("openaiOcrResults", {
        pdfId: args.pdfId,
        cleanedText: args.text,
        cleaningStatus: "completed",
        processedAt: Date.now(),
        source: args.source,
      });
    }
    
    // Update the PDF status to indicate processing is complete
    await ctx.db.patch(args.pdfId, {
      status: "processed",
    });
  },
});