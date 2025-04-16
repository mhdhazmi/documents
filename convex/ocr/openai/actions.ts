import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import OpenAI from "openai";
import { openai as openaiConfig } from "../../config";

interface CleanupResult {
  success: boolean;
  pdfId: Id<"pdfs">;
  provider: string;
  source: string; // "gemini" or "replicate"
  textLength?: number;
  error?: string;
}

// Action to clean up OCR text using OpenAI
export const cleanupOcrText = action({
  args: {
    pdfId: v.id("pdfs"),
    source: v.union(v.literal("gemini"), v.literal("replicate"))
  },
  handler: async (ctx, args): Promise<CleanupResult> => {
    try {
      console.log(`Starting OpenAI cleanup for ${args.source} OCR results of PDF ${args.pdfId}`);
      
      // Get the OCR results from the specified source (Gemini or Replicate)
      let ocrText = "";
      if (args.source === "gemini") {
        const geminiResults = await ctx.runQuery(api.ocr.gemini.queries.getOcrResults, { pdfId: args.pdfId });
        if (!geminiResults?.ocrResults?.extractedText) {
          throw new Error(`No Gemini OCR results found for PDF ${args.pdfId}`);
        }
        ocrText = geminiResults.ocrResults.extractedText;
      } else {
        const replicateResults = await ctx.runQuery(api.ocr.replicate.queries.getOcrResults, { pdfId: args.pdfId });
        if (!replicateResults?.ocrResults?.extractedText) {
          throw new Error(`No Replicate OCR results found for PDF ${args.pdfId}`);
        }
        ocrText = replicateResults.ocrResults.extractedText;
      }
      
      // Initialize OpenAI client
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured in environment variables");
      }
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
      
      // Call OpenAI API to clean up the text
      const response = await openai.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          {
            role: "system",
            content: openaiConfig.systemPrompt
          },
          {
            role: "user",
            content: `${openaiConfig.userPromptPrefix}${ocrText}`
          }
        ],
        temperature: openaiConfig.temperature,
      });
      
      const cleanedText = response.choices[0]?.message?.content;
      if (!cleanedText) {
        throw new Error("OpenAI returned empty response");
      }
      
      // Save the cleaned text to the database
      const pdf = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId: args.pdfId });
      if (!pdf) {
        throw new Error(`PDF metadata not found for ID: ${args.pdfId}`);
      }
      
      // Save the cleaned OCR results
      await ctx.runMutation(internal.ocr.openai.mutations.saveCleanedResults, {
        pdfId: args.pdfId,
        fileId: pdf.fileId,
        originalSource: args.source,
        cleanedText: cleanedText,
        openaiModel: openaiConfig.model
      });
      
      return {
        success: true,
        pdfId: args.pdfId,
        provider: "openai",
        source: args.source,
        textLength: cleanedText.length
      };
      
    } catch (error: unknown) {
      console.error(`Error in OpenAI cleanup for ${args.source} OCR of PDF ${args.pdfId}:`, error);
      
      return {
        success: false,
        pdfId: args.pdfId,
        provider: "openai",
        source: args.source,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}); 