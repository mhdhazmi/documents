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




// Action to process a PDF using Google Gemini AI for OCR
export const processPdfWithOcr = action({
  args: {
    pdfId: v.id("pdfs"), 
  },
  handler: async (ctx, args)=> {
    try {

      const current = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId: args.pdfId });
      if (!current ) {
        throw new Error("PDF must be uploaded before OCR.");
      }
      

      // 1. Update PDF status to "processing" for Gemini
      await ctx.runMutation(internal.ocr.gemini.mutations.updateOcrStatus, {
        pdfId: args.pdfId as Id<"pdfs">,
        ocrStatus: "processing",
      });
      console.log(`Gemini processing started for PDF: ${args.pdfId}`);

     

      // 3. Fetch the actual PDF file content from Convex storage
      const fileData = await ctx.storage.getUrl(current.fileId);
      if (!fileData) {
        throw new Error(`PDF file blob not found in storage for fileId: ${current.fileId}`);
      }
      console.log(fileData);

      const pdfBuffer = await fetch(fileData)
        .then((response) => response.arrayBuffer());
      // 4. Prepare the file data for the Gemini API
      const fileBlob: Blob = new Blob([pdfBuffer], { type: 'application/pdf' });

      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key (GEMINI_API_KEY) is not configured in Convex environment variables.");
      }

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const modelName = geminiConfig.model;

      const file = await ai.files.upload({
        file: fileBlob,
        config: {
          displayName: '.pdf',
        },
      });

      if (!file.name) {
        throw new Error("File name is not available.");
      }

      // Wait for the file to be processed.
      let getFile = await ai.files.get({ name: file.name });
      while (getFile.state === 'PROCESSING') {
        getFile = await ai.files.get({ name: file.name });
        console.log(`current file status: ${getFile.state}`);
        console.log('File is still processing, retrying in 5 seconds');

        await new Promise((resolve) => {
          setTimeout(resolve, geminiConfig.fileProcessingPollingIntervalMs);
        });
      }
      if (file.state === 'FAILED') {
        throw new Error('File processing failed.');
      }

      // 6. Create the prompt and file part
      const prompt: (string | Part)[] = [geminiConfig.prompt];

      if (file.uri && file.mimeType) {
        const fileContent = createPartFromUri(file.uri, file.mimeType);
        prompt.push(fileContent);
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      // 8. Extract the text from the response

      if (!response.text) {
        throw new Error("Gemini API did not return any text content.");
      }

      console.log(response.text);

      console.log(`Gemini OCR successful for PDF ${args.pdfId}. Text length: ${response.candidates?.[0]?.tokenCount}`);

      // 9. Save the extracted text and update PDF status
      await ctx.runMutation(internal.ocr.gemini.mutations.updateOcrResutls, {
        pdfId: args.pdfId,
        extractedText: response.text,
        ocrStatus: "completed",
      });

    
      // 10. Immediately trigger OpenAI cleanup without waiting for other OCR services
      console.log(`Immediately triggering OpenAI cleanup for Gemini OCR results of PDF ${args.pdfId}`);

      // 11. Return success status
      

    } catch (error: unknown) {
      console.error(`Gemini OCR failed for PDF ${args.pdfId}:`, error);

      await ctx.runMutation(internal.ocr.gemini.mutations.updateOcrStatus, {
        pdfId: args.pdfId,
        ocrStatus: "failed",
      });

    }
  },
});







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