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
    // Legacy openaiOcrResults table has been removed
    // We now only need to update the PDF status directly
    
    // Update the PDF status to indicate processing is complete
    await ctx.db.patch(args.pdfId, {
      status: "processed",
    });
    
    // Note: The concatenated text is now only used for summarization and embedding
    // We don't need to store it permanently in a separate table
    // If needed, it should be stored in pdfSummaries or implemented with a new table
    
    console.log(`Concatenated text for ${args.pdfId} (${args.source}) processed - PDF marked as processed`);
  },
});