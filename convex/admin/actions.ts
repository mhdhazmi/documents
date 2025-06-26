import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const reprocessPdfChunks = action({
  args: { pdfId: v.id("pdfs") },
  handler: async (ctx, args): Promise<void> => {
    // Run chunk creation and embedding again for an existing PDF.
    await ctx.runMutation(internal.ingest.ingest.createChunks, {
      pdfId: args.pdfId,
    });

    // Directly run embedding to update vectors with the latest chunk text.
    await ctx.runAction(internal.ingest.ingest.embedList, {
      documentIds: [args.pdfId],
    });
  },
});
