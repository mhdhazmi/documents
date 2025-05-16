// convex/ocr/replicate/actions.ts
import { action, internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import Replicate from "replicate";
import { Id } from "../../_generated/dataModel";
import { replicate as replicateConfig } from "../../config";
import { runWithRetry } from "../../utils/retry";

/* ------------------------------------------------------------------ *
 * 1. Helper: merge *all* chunks returned by lucataco/olmocr-7b
 * ------------------------------------------------------------------ */
function extractOCRText(replicateOutput: unknown): string {
  /* normalise to an array of stringified chunks */
  const chunks: string[] = (() => {
    if (Array.isArray(replicateOutput)) return replicateOutput.map(String);
    if (typeof replicateOutput === "string") return [replicateOutput];
    if (
      replicateOutput &&
      typeof replicateOutput === "object" &&
      "output" in replicateOutput
    ) {
      const out = (replicateOutput as any).output;
      return Array.isArray(out) ? out.map(String) : [String(out)];
    }
    return [JSON.stringify(replicateOutput)];
  })();

  /* pull natural_text (or best effort) out of every chunk */
  const texts = chunks.map((chunk) => {
    try {
      const obj = JSON.parse(chunk);
      if (obj && typeof obj.natural_text === "string") return obj.natural_text;
    } catch {
      /* not JSON – fall through */
    }
    const m = chunk.match(/natural_text["']\s*:\s*["']([^"']+)["']/);
    return m ? m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : chunk;
  });

  return texts.join("\n");
}

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

/* ------------------------------------------------------------------ *
 * Legacy whole-PDF OCR (processPdfWithOcr) has been removed
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * 3. Single-page OCR fix – use real page number + token bump
 * ------------------------------------------------------------------ */
export const processPageWithOcr = internalAction({
  args: { pageId: v.id("pages") },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; pageId: Id<"pages">; provider: string }> => {
    try {
      const page = await ctx.runQuery(api.pdf.queries.getPdfPage, {
        pageId: args.pageId,
      });
      if (!page) throw new Error(`Page not found: ${args.pageId}`);

      await ctx.runMutation(
        internal.ocr.replicate.mutations.updatePageOcrStatus,
        { pageId: args.pageId, ocrStatus: "processing" },
      );

      const fileUrl = await ctx.storage.getUrl(page.fileId);
      if (!fileUrl) throw new Error(`File not found: ${page.fileId}`);

      const input = {
        pdf: fileUrl,
        page_number: 1, // ← FIXED
        max_new_tokens: 2048, // Increased token limit to handle longer documents without repetition
        temperature: replicateConfig.temperature, // Use temperature setting from config
      };

      const pageOutput = await runWithRetry({
        operation: () =>
          replicate.run(
            `${replicateConfig.model}:${replicateConfig.modelVersion}` as `${string}/${string}:${string}`,
            { input },
          ),
        maxRetries: replicateConfig.maxRetries,
        initialDelayMs: replicateConfig.retryDelayMs,
      });

      // Log the raw response from Replicate to diagnose repetition issues
      console.log(`Replicate Raw Response for page ${args.pageId}:`, JSON.stringify(pageOutput, null, 2));
      
      // Also log the type of response
      console.log(`Replicate Response Type for page ${args.pageId}:`, Array.isArray(pageOutput) ? "Array" : typeof pageOutput);
      
      // If it's an array, log some stats to understand the structure better
      if (Array.isArray(pageOutput)) {
        console.log(`Array length: ${pageOutput.length}`);
        
        // Log first few items (up to 3) for inspection
        for (let i = 0; i < Math.min(3, pageOutput.length); i++) {
          console.log(`Item ${i} type:`, typeof pageOutput[i]);
          console.log(`Item ${i} sample:`, String(pageOutput[i]).substring(0, 200) + "...");
        }
      }

      const extractedText = extractOCRText(pageOutput);

      await ctx.runMutation(
        internal.ocr.replicate.mutations.updatePageOcrResults,
        {
          pageId: args.pageId,
          extractedText,
          ocrStatus: "completed",
        },
      );

      console.log(
        `Replicate OCR done for page ${args.pageId} – ${extractedText.length.toLocaleString()} chars`,
      );

      return { success: true, pageId: args.pageId, provider: "replicate" };
    } catch (error) {
      console.error(`Replicate OCR failed for page ${args.pageId}:`, error);
      await ctx.runMutation(
        internal.ocr.replicate.mutations.updatePageOcrStatus,
        { pageId: args.pageId, ocrStatus: "failed" },
      );
      throw error;
    }
  },
});
