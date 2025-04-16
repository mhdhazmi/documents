// convex/ocr/gemini/actions.ts
import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { createPartFromUri, GoogleGenAI, Part } from "@google/genai";
import { gemini as geminiConfig } from "../../config";

// Define valid status types to match the schema
type PdfStatus = "processing" | "processed" | "failed" | "uploaded";

interface ProcessPdfResult {
  success: boolean;
  pdfId: Id<"pdfs">;
  provider: string;
  textLength?: number;
  error?: string;
}

// Action to process a PDF using Google Gemini AI for OCR
export const processPdfWithOcr = action({
  args: {
    pdfId: v.id("pdfs"), // Expects the ID of the PDF document in the 'pdfs' table
  },
  handler: async (ctx, args): Promise<ProcessPdfResult> => {
    try {
      // 1. Update PDF status to "processing" for Gemini
      await ctx.runMutation(internal.pdf.mutations.updatePdfStatus, {
        pdfId: args.pdfId,
        status: "processing" as PdfStatus,
        processingError: undefined,
      });
      console.log(`Gemini processing started for PDF: ${args.pdfId}`);

      // 2. Retrieve PDF metadata (needed for fileId)
      const pdf = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId: args.pdfId });
      if (!pdf) {
        throw new Error(`PDF metadata not found for ID: ${args.pdfId}`);
      }

      // 3. Fetch the actual PDF file content from Convex storage
      const fileData = await ctx.storage.getUrl(pdf.fileId);
      if (!fileData) {
        throw new Error(`PDF file blob not found in storage for fileId: ${pdf.fileId}`);
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
  
      const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
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
      const prompt : (string | Part)[] = [geminiConfig.prompt];
      
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
      await ctx.runMutation(internal.ocr.gemini.mutations.saveOcrResults, {
        pdfId: args.pdfId,
        fileId: pdf.fileId,
        extractedText: response.text,
        geminiModel: modelName,
      });

      // 10. Immediately trigger OpenAI cleanup without waiting for other OCR services
      console.log(`Immediately triggering OpenAI cleanup for Gemini OCR results of PDF ${args.pdfId}`);
      try {
        // Schedule the OpenAI cleanup action to run after this action completes
        await ctx.scheduler.runAfter(0, api.ocr.openai.actions.cleanupOcrText, {
          pdfId: args.pdfId,
          source: "gemini"
        });
      } catch (err) {
        console.error(`Error scheduling OpenAI cleanup for Gemini results: ${err}`);
        // Continue with success result even if scheduling cleanup fails
      }

      // 11. Return success status
      return {
        success: true,
        pdfId: args.pdfId,
        provider: "gemini",
        textLength: response.text.length,
      };

    } catch (error: unknown) {
      console.error(`Gemini OCR failed for PDF ${args.pdfId}:`, error);

      await ctx.runMutation(internal.pdf.mutations.updatePdfStatus, {
        pdfId: args.pdfId,
        status: "failed" as PdfStatus,
        processingError: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        pdfId: args.pdfId,
        provider: "gemini",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});