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
    // Start PDF splitting, but continue processing right away
    // This allows us to process pages as they become available
    const pageIdPromise = step.runAction(
      internal.pdf.actions.splitPdfIntoPages,
      { pdfId },
      { name: `SplitPDF-${pdfId}` }
    );
    
    // Start the concatenate workflow immediately - it will wait for pages
    // This sets up the infrastructure to process pages as they come in
    await step.runMutation(
      internal.workflow.concatenateWorkflow.startConcatenateWorkflow,
      { pdfId, earlyProcessing: true },
      { name: `StartConcatenate-${pdfId}` }
    );
    
    // Now wait for page IDs from the split operation
    const pageIds = await pageIdPromise;
    
    // Enhanced processing strategy that prioritizes first page
    if (pageIds.length > 0) {
      // Process first page immediately with maximum priority
      const firstPageId = pageIds[0];
      
      // Start both providers for first page with highest priority
      // Use parallel processing for the first page to get results as fast as possible
      await Promise.all([
        step.runMutation(
          internal.workflow.providerWorkflow.kickoffproviderWorkflow,
          { pageId: firstPageId, provider: "gemini", priority: "high" },
          { name: `GeminiWF-First-${firstPageId}` }
        ),
        step.runMutation(
          internal.workflow.providerWorkflow.kickoffproviderWorkflow,
          { pageId: firstPageId, provider: "replicate", priority: "high" },
          { name: `ReplicateWF-First-${firstPageId}` }
        )
      ]);
      
      // Mark first page as being processed for early viewing
      await step.runMutation(
        internal.pdf.mutations.markPageAsPriority,
        { pageId: firstPageId, isPriority: true },
        { name: `MarkFirstPagePriority-${firstPageId}` }
      );
      
      // Process remaining pages in batches with staggered priorities
      // This allows resources to concentrate on the first page initially
      const remainingPages = pageIds.slice(1);
      
      // Divide remaining pages into priority groups
      // First few pages get higher priority than later pages
      const highPriorityPages = remainingPages.slice(0, 2); // Next 2 pages
      const mediumPriorityPages = remainingPages.slice(2, 5); // Next 3 pages
      const lowPriorityPages = remainingPages.slice(5); // Rest of the pages
      
      // Process high priority pages first
      if (highPriorityPages.length > 0) {
        await Promise.all(highPriorityPages.map(async (pageId, index) => {
          const preferGemini = index % 2 === 0;
          
          await Promise.all([
            step.runMutation(
              internal.workflow.providerWorkflow.kickoffproviderWorkflow,
              { 
                pageId, 
                provider: "gemini", 
                priority: preferGemini ? "normal" : "low"
              },
              { name: `GeminiWF-High-${pageId}` }
            ),
            step.runMutation(
              internal.workflow.providerWorkflow.kickoffproviderWorkflow,
              { 
                pageId, 
                provider: "replicate", 
                priority: preferGemini ? "low" : "normal" 
              },
              { name: `ReplicateWF-High-${pageId}` }
            )
          ]);
        }));
      }
      
      // Then medium priority pages
      if (mediumPriorityPages.length > 0) {
        await Promise.all(mediumPriorityPages.map(async (pageId, index) => {
          const preferGemini = index % 2 === 0;
          
          await Promise.all([
            step.runMutation(
              internal.workflow.providerWorkflow.kickoffproviderWorkflow,
              { 
                pageId, 
                provider: "gemini", 
                priority: preferGemini ? "normal" : "low"
              },
              { name: `GeminiWF-Medium-${pageId}` }
            ),
            step.runMutation(
              internal.workflow.providerWorkflow.kickoffproviderWorkflow,
              { 
                pageId, 
                provider: "replicate", 
                priority: preferGemini ? "low" : "normal" 
              },
              { name: `ReplicateWF-Medium-${pageId}` }
            )
          ]);
        }));
      }
      
      // Finally, low priority pages
      if (lowPriorityPages.length > 0) {
        await Promise.all(lowPriorityPages.map(async (pageId, index) => {
          const preferGemini = index % 2 === 0;
          
          await Promise.all([
            step.runMutation(
              internal.workflow.providerWorkflow.kickoffproviderWorkflow,
              { 
                pageId, 
                provider: "gemini", 
                priority: "low"
              },
              { name: `GeminiWF-Low-${pageId}` }
            ),
            step.runMutation(
              internal.workflow.providerWorkflow.kickoffproviderWorkflow,
              { 
                pageId, 
                provider: "replicate", 
                priority: "low" 
              },
              { name: `ReplicateWF-Low-${pageId}` }
            )
          ]);
        }));
      }
    }

    // Return immediately — parent is done.
    return { pageIds };
  },
});