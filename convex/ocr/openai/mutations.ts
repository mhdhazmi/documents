import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

// Internal mutation to save results from OpenAI cleanup processing
export const saveCleanedResults = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    fileId: v.string(),
    originalSource: v.union(v.literal("gemini"), v.literal("replicate")),
    cleanedText: v.string(),
    openaiModel: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if we already have results for this PDF
    const existingResult = await ctx.db
        .query("openaiOcrResults")
        .withIndex("by_pdf_and_source", q => 
            q.eq("pdfId", args.pdfId).eq("originalSource", args.originalSource))
        .first();

    let resultId;
    if (existingResult) {
        // Update existing record
        console.log(`Updating existing OpenAI cleanup results for PDF ${args.pdfId} (source: ${args.originalSource})`);
        await ctx.db.patch(existingResult._id, {
            cleanedText: args.cleanedText,
            processedAt: Date.now(),
            openaiModel: args.openaiModel,
        });
        resultId = existingResult._id;
    } else {
        // Insert new record
        resultId = await ctx.db.insert("openaiOcrResults", {
            pdfId: args.pdfId,
            fileId: args.fileId,
            originalSource: args.originalSource,
            cleanedText: args.cleanedText,
            processedAt: Date.now(),
            openaiModel: args.openaiModel,
        });
    }

    console.log(`Saved OpenAI cleanup results for PDF ${args.pdfId} (source: ${args.originalSource}). Result ID: ${resultId}`);
    return resultId;
  },
}); 