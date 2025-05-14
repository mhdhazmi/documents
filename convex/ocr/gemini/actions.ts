// convex/ocr/gemini/actions.ts
import { action, internalAction } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { createPartFromUri, GoogleGenAI, Part } from "@google/genai";
import { gemini as geminiConfig } from "../../config";
import main from "../../utils/geminiOcr";
import geminiPageOcr from "../../utils/geminiOcr";

// Define valid status types to match the schema




// Legacy Action to process a PDF using Google Gemini AI for OCR has been removed







// Action to process a single page with Google Gemini AI for OCR
export const processPageWithOcr = internalAction({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; pageId: Id<"pages">; provider: string }> => {
    try {
      // Get the page details
      const page = await ctx.runQuery(api.pdf.queries.getPdfPage, { pageId: args.pageId });
      if (!page) {
        throw new Error(`Page not found for ID: ${args.pageId}`);
      }

      // Update the page OCR status to "processing"
      await ctx.runMutation(internal.ocr.gemini.mutations.updatePageOcrStatus, {
        pageId: args.pageId,
        ocrStatus: "processing",
      });
      
      console.log(`Gemini processing started for page: ${args.pageId} (page ${page.pageNumber})`);

      const fileId = page.fileId;

      // Fetch the page file content from Convex storage
      const fileUrl = await ctx.storage.getUrl(fileId);
      
      if (!fileUrl) {
        throw new Error(`Page file not found in storage for fileId: ${page.fileId}`);
      }

     

      

      // Generate content with retry
      const response = await geminiPageOcr(fileUrl);
      console.log("Response from Gemini: ", response);

      if (!response.text) {
        throw new Error("Gemini API did not return any text content.");
      }

      console.log(`Gemini OCR successful for page ${args.pageId}. Text length: ${response.text.length}`);

      // Save the extracted text and update page OCR status
      await ctx.runMutation(internal.ocr.gemini.mutations.updatePageOcrResults, {
        pageId: args.pageId,
        extractedText: response.text,
        ocrStatus: "completed",
      });

      // Later in Sprint 5, we'll immediately trigger OpenAI cleanup here
      
      return { 
        success: true, 
        pageId: args.pageId,
        provider: "gemini",
      };
    } catch (error) {
      console.error(`Gemini OCR failed for page ${args.pageId}:`, error);

      // Update status to failed
      await ctx.runMutation(internal.ocr.gemini.mutations.updatePageOcrStatus, {
        pageId: args.pageId,
        ocrStatus: "failed",
      });

      throw error;
    }
  },
});