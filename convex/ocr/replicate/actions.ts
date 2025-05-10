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
 * 2. Whole-PDF OCR (unchanged except for chunk fix + token limit bump)
 * ------------------------------------------------------------------ */
export const processPdfWithOcr = action({
  args: { pdfId: v.id("pdfs") },
  handler: async (ctx, args) => {
    try {
      const current = await ctx.runQuery(api.pdf.queries.getPdf, {
        pdfId: args.pdfId,
      });
      if (!current) throw new Error("PDF must be uploaded before OCR.");

      await ctx.runMutation(internal.ocr.replicate.mutations.updateOcrStatus, {
        pdfId: args.pdfId as Id<"pdfs">,
        ocrStatus: "processing",
      });

      const fileData = await ctx.storage.getUrl(current.fileId);
      if (!fileData)
        throw new Error(
          `PDF blob not found in storage for fileId: ${current.fileId}`,
        );

      console.log(
        `Processing ${current.pageCount} pages of PDF ${args.pdfId} via ${replicateConfig.model}`,
      );

      /* ---------- helper to OCR a single page ---------- */
      const processPage = async (pageNumber: number) => {
        const input = {
          pdf: fileData,
          page_number: 1,
          max_new_tokens:
            1024, // bump from 1024
          temperature: replicateConfig.temperature ?? 0.1,
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

        const text = extractOCRText(pageOutput);
        console.log(
          `✓ page ${pageNumber} – ${text.length.toLocaleString()} chars`,
        );
        return { pageNumber, text };
      };

      /* ---------- batched concurrency ---------- */
      const pageResults = [];
      for (let i = 0; i < current.pageCount; i += replicateConfig.batchSize) {
        const batch = Array.from(
          { length: Math.min(replicateConfig.batchSize, current.pageCount - i) },
          (_, j) => processPage(i + j + 1),
        );
        pageResults.push(...(await Promise.all(batch)));
      }

      /* ---------- aggregate + store ---------- */
      pageResults.sort((a, b) => a.pageNumber - b.pageNumber);
      const aggregatedText = pageResults
        .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.text}`)
        .join("\n\n");

      await ctx.runMutation(internal.ocr.replicate.mutations.updateOcrResutls, {
        pdfId: args.pdfId,
        extractedText: aggregatedText,
        ocrStatus: "completed",
      });

      console.log(
        `Replicate OCR finished for PDF ${args.pdfId} (${aggregatedText.length.toLocaleString()} chars total)`,
      );
    } catch (error) {
      console.error(`Replicate OCR failed for PDF ${args.pdfId}:`, error);
      await ctx.runMutation(internal.ocr.replicate.mutations.updateOcrStatus, {
        pdfId: args.pdfId,
        ocrStatus: "failed",
      });
      throw error;
    }
  },
});

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
        max_new_tokens: 1024, 
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
