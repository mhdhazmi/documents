// convex/workflows/concatenateWorkflow.ts
import { workflow } from "./index";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { action, internalMutation } from "../_generated/server";

export const concatenateAndEmbedWorkflow = workflow.define({
  args: {
    pdfId: v.id("pdfs"),
    preferredSource: v.optional(v.union(v.literal("gemini"), v.literal("replicate"))),
    retryCount: v.optional(v.number()),
  },
  handler: async (step, { pdfId, preferredSource, retryCount = 0 }): Promise<void> => {
    try {
      // 1. Get all pages for this PDF
      const pages = await step.runQuery(
        api.pdf.queries.getPdfPages,
        { pdfId },
        { name: `GetPDFPages-${pdfId}` }
      );
      
      if (!pages || pages.length === 0) {
        throw new Error(`No pages found for PDF ${pdfId}`);
      }
      
      console.log(`Found ${pages.length} pages for PDF ${pdfId}`);
      
      // 2. Check if all pages have cleaned text for at least one source
      let allPagesComplete = false;
      let completeSource: "gemini" | "replicate" | null = null;
      
      // Try the preferred source first if specified
      if (preferredSource) {
        const allComplete = await step.runQuery(
          internal.concatenate.queries.areAllPagesComplete,
          { pdfId, source: preferredSource },
          { name: `CheckCompletion-${preferredSource}-${pdfId}` }
        );
        
        if (allComplete) {
          allPagesComplete = true;
          completeSource = preferredSource;
        }
      }
      
      // If preferred source isn't complete or wasn't specified, check both sources
      if (!allPagesComplete) {
        // Try Gemini first (if it wasn't already the preferred source)
        if (preferredSource !== "gemini") {
          const geminiComplete = await step.runQuery(
            internal.concatenate.queries.areAllPagesComplete,
            { pdfId, source: "gemini" },
            { name: `CheckCompletion-gemini-${pdfId}` }
          );
          
          if (geminiComplete) {
            allPagesComplete = true;
            completeSource = "gemini";
          }
        }
        
        // Try Replicate if Gemini isn't complete
        if (!allPagesComplete && preferredSource !== "replicate") {
          const replicateComplete = await step.runQuery(
            internal.concatenate.queries.areAllPagesComplete,
            { pdfId, source: "replicate" },
            { name: `CheckCompletion-replicate-${pdfId}` }
          );
          
          if (replicateComplete) {
            allPagesComplete = true;
            completeSource = "replicate";
          }
        }
      }
      
      // If no source is fully complete, schedule another check after a delay
      if (!allPagesComplete || !completeSource) {
        console.log(`Not all pages complete for PDF ${pdfId}, will retry later (attempt ${retryCount})`);
        
        // Limit retry attempts to avoid infinite loops
        if (retryCount < 10) {
          // Schedule this same workflow to run again after 30 seconds
          // Instead of using sleep, we use the scheduler to run the workflow again
          await step.runAction(
            internal.concatenate.actions.recheckConcatenation,
            { 
              pdfId, 
              preferredSource,
              retryCount: retryCount + 1 
            },
            { 
              runAfter: 30000, // 30 seconds
              name: `RetryConcatenate-${pdfId}-${retryCount}` 
            }
          );
        } else {
          console.log(`Max retries reached for PDF ${pdfId}, giving up`);
        }
        
        return;
      }
      
      console.log(`All pages complete for PDF ${pdfId} using ${completeSource} source`);
      
      // 3. Concatenate the text for all pages in order
      const concatenatedText = await step.runQuery(
        internal.concatenate.queries.getConcatenatedText,
        { pdfId, source: completeSource },
        { name: `ConcatenateText-${pdfId}` }
      );
      
      // 4. Store the concatenated text
      await step.runMutation(
        internal.concatenate.mutations.saveConcatenatedText,
        { pdfId, source: completeSource, text: concatenatedText },
        { name: `SaveConcatenated-${pdfId}` }
      );
      
      // 5 & 6: Start both embedding and summary generation in parallel
      // This avoids waiting for embedding to complete before starting summary
      await Promise.all([
        // Start the embedding process
        step.runAction(
          api.ingest.ingest.chunkAndEmbed,
          { pdfId },
          { 
            retry: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
            name: `ChunkAndEmbed-${pdfId}` 
          }
        ),
        
        // Generate a summary of the PDF content (in parallel)
        step.runMutation(
          api.pdf.mutations.generatePdfSummary,
          { pdfId },
          { name: `GeneratePdfSummary-${pdfId}` }
        )
      ]);
      
      console.log(`Successfully processed PDF ${pdfId} with ${completeSource} source and started summary generation`);
    } catch (error) {
      console.error(`Error in concatenateAndEmbedWorkflow for PDF ${pdfId}:`, error);
      throw error;
    }
  },
});

export const startConcatenateWorkflow = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    preferredSource: v.optional(v.union(v.literal("gemini"), v.literal("replicate"))),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await workflow.start(
      ctx,
      internal.workflow.concatenateWorkflow.concatenateAndEmbedWorkflow,
      { 
        pdfId: args.pdfId,
        preferredSource: args.preferredSource,
        retryCount: args.retryCount ?? 0
      },
    );
  },
});