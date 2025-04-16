// convex/ocr/actions.ts
import { action, mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

interface ProcessPdfResult {
  success: boolean;
  pdfId: Id<"pdfs">;
  provider: string;
  textLength?: number;
  error?: string;
}

interface OcrServiceResult {
  status: "fulfilled" | "rejected" | "unknown";
  value?: ProcessPdfResult;
  error?: string;
}

interface MultipleOcrResult {
  pdfId: Id<"pdfs">;
  gemini: OcrServiceResult;
  replicate: OcrServiceResult;
  status?: "failed";
  error?: string;
}

export const processWithMultipleOcrMutation = mutation({
  args: {
    pdfId: v.id("pdfs")
  },
  handler: async (ctx, args) => {
    // Mutations cannot directly run actions, so we schedule it to run after 0ms
    await ctx.scheduler.runAfter(0, api.ocr.actions.processWithMultipleOcr, { pdfId: args.pdfId });
    
  }
});


// Action to trigger both OCR services in parallel for a given PDF
export const processWithMultipleOcr = action({
  args: {
    pdfId: v.id("pdfs")
  },
  handler: async (ctx, args): Promise<MultipleOcrResult> => {
    try {
      // Use Promise.allSettled to run both OCR actions concurrently
      const [geminiResult, replicateResult] = await Promise.allSettled([
        ctx.runAction(api.ocr.gemini.actions.processPdfWithOcr, { pdfId: args.pdfId }),
        ctx.runAction(api.ocr.replicate.actions.processPdfWithOcr, { pdfId: args.pdfId })
      ]) as [PromiseSettledResult<ProcessPdfResult>, PromiseSettledResult<ProcessPdfResult>];

      const results: MultipleOcrResult = {
        pdfId: args.pdfId,
        gemini: {
          status: geminiResult.status,
          ...(geminiResult.status === "fulfilled" ? { value: geminiResult.value } : { error: geminiResult.reason instanceof Error ? geminiResult.reason.message : String(geminiResult.reason) }),
        },
        replicate: {
          status: replicateResult.status,
          ...(replicateResult.status === "fulfilled" ? { value: replicateResult.value } : { error: replicateResult.reason instanceof Error ? replicateResult.reason.message : String(replicateResult.reason) }),
        }
      };

      console.log(`Multiple OCR processing finished for PDF ${args.pdfId}: Gemini ${results.gemini.status}, Replicate ${results.replicate.status}`);

      // Note: OpenAI cleanup is now triggered directly by each OCR service when they complete
      // This way we don't have to wait for both services to complete before starting cleanup
      
      return results;

    } catch (error: unknown) {
      console.error(`Error in processWithMultipleOcr action for PDF ${args.pdfId}:`, error);

      return {
        pdfId: args.pdfId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        gemini: { status: 'unknown' as const },
        replicate: { status: 'unknown' as const },
      };
    }
  }
});