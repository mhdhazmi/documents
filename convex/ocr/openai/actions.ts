// import { action } from "../../_generated/server";
// import { v } from "convex/values";
// import { api, internal } from "../../_generated/api";
// import { Id } from "../../_generated/dataModel";
// import OpenAI from "openai";
// import { openai as openaiConfig } from "../../config";

// interface CleanupResult {
//   success: boolean;
//   pdfId: Id<"pdfs">;
//   provider: string;
//   source: string; // "gemini" or "replicate"
//   textLength?: number;
//   error?: string;
// }


// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// if (!OPENAI_API_KEY) {
//   throw new Error(
//     "OpenAI API key is not configured – please set OPENAI_API_KEY"
//   );
// }
// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });


// export const cleanupOcrText = action({
//   args: {
//     pdfId: v.id("pdfs"),
//     source: v.union(v.literal("gemini"), v.literal("replicate")),
//   },
//   handler: async (ctx, { pdfId, source }): Promise<CleanupResult> => {
//     try {
//       console.log(
//         `[cleanupOcrText] Starting OpenAI cleanup for ${source} OCR of PDF ${pdfId}`
//       );

//       // Kick off both lookups in parallel:
//       const ocrQuery =
//         source === "gemini"
//           ? api.ocr.gemini.queries.getOcrResults
//           : api.ocr.replicate.queries.getOcrResults;
//       const [ocrRes, pdf] = await Promise.all([
//         ctx.runQuery(ocrQuery, { pdfId }),
//         ctx.runQuery(api.pdf.queries.getPdf, { pdfId }),
//       ]);

//       if (!ocrRes?.ocrResults?.extractedText) {
//         throw new Error(`No ${source} OCR results for PDF ${pdfId}`);
//       }
//       if (!pdf) {
//         throw new Error(`PDF metadata not found for ID ${pdfId}`);
//       }

//       const rawText = ocrRes.ocrResults.extractedText;

//       // Call OpenAI non‑streaming
//       const completion = await openai.chat.completions.create({
//         model: openaiConfig.model,
//         messages: [
//           { role: "system", content: openaiConfig.systemPrompt },
//           { role: "user", content: openaiConfig.userPromptPrefix + rawText },
//         ],
//         temperature: openaiConfig.temperature,
//       });

//       const cleanedText =
//         completion.choices?.[0]?.message?.content?.trim() ?? "";

//       if (!cleanedText) {
//         throw new Error("OpenAI returned empty cleaned text");
//       }

//       // Single upsert once fully cleaned
//       await ctx.runMutation(
//         internal.ocr.openai.mutations.saveCleanedResults,
//         {
//           pdfId,
//           cleanedText,
//           cleaningStatus: "completed",
//           source,
//         }
//       );

//       console.log(
//         `[cleanupOcrText] Finished cleaning PDF ${pdfId}, length=${cleanedText.length}`
//       );
//       return {
//         success: true,
//         pdfId,
//         provider: "openai",
//         source,
//         textLength: cleanedText.length,
//       };
//     } catch (err: unknown) {
//       const message =
//         err instanceof Error ? err.message : String(err || "Unknown error");
//       console.error(
//         `[cleanupOcrText][ERROR] PDF ${pdfId} (${source}): ${message}`,
//         err
//       );
//       return {
//         success: false,
//         pdfId: pdfId,
//         provider: "openai",
//         source,
//         error: message,
//       };
//     }
//   },
// });
