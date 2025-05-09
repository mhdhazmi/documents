// convex/concatenate/actions.ts
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";


export const recheckConcatenation = internalAction({
  args: {
    pdfId: v.id("pdfs"),
    preferredSource: v.optional(v.union(v.literal("gemini"), v.literal("replicate"))),
    retryCount: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      // Restart the concatenation workflow with updated retry count
      await ctx.runMutation(internal.workflow.concatenateWorkflow.startConcatenateWorkflow, args);
      
      return {
        success: true,
        message: `Restarted concatenation workflow for PDF ${args.pdfId} (retry ${args.retryCount})`,
      };
    } catch (error) {
      console.error(`Error restarting concatenation workflow for PDF ${args.pdfId}:`, error);
      throw error;
    }
  },
});