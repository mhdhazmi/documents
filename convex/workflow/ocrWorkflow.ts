// convex/workflows/ocrWorkflow.ts
import { workflow } from "./index";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";



export const ocrWorkflow = workflow.define({
  args: { pdfId: v.id("pdfs") },

  handler: async (
    step,
    { pdfId }
  ): Promise<{ pageIds: Id<"pages">[] }> => {
    // Split first
    const pageIds: Id<"pages">[] = await step.runAction(
      internal.pdf.actions.splitPdfIntoPages,
      { pdfId },
      { name: `SplitPDF-${pdfId}` }
    );

    // Spawn 2 · N child workflows and DON'T await anything
    for (const pageId of pageIds) {
      // Start the Gemini workflow
      await step.runMutation(
        internal.workflow.providerWorkflow.kickoffproviderWorkflow,
        { pageId, provider: "gemini" },
        { name: `GeminiWF-${pageId}` }
      );

      await step.runMutation(
        internal.workflow.providerWorkflow.kickoffproviderWorkflow,
        { pageId, provider: "replicate" },
        { name: `ReplicateWF-${pageId}` }
      );
      
    }

    await step.runMutation(
      internal.workflow.concatenateWorkflow.startConcatenateWorkflow,
      { pdfId },
      { name: `StartConcatenate-${pdfId}` }
    );

    // Return immediately — parent is done.
    return { pageIds };
  },
});


