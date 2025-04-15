// convex/ocr/replicate/actions.ts
import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import Replicate from "replicate";
import { Id } from "../../_generated/dataModel";

// Define interfaces for the types
interface ProcessPdfResult {
  success: boolean;
  pdfId: Id<"pdfs">;
  provider: string;
  pageCount?: number;
  textLength?: number;
  error?: string;
}

interface PdfDocument {
  fileId: string;
  filename: string;
  fileSize: number;
  pageCount: number;
  uploadedAt: number;
  status: string;
  replicateStatus?: string;
  replicateProcessingError?: string;
  processingError?: string;
}

interface PageResult {
  pageNumber: number;
  text: string;
}

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Action to process a PDF with Replicate OCR
export const processPdfWithOcr = action({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args): Promise<ProcessPdfResult> => {
    let pdf: PdfDocument | null = null; 
    try {
      // 1. Get PDF metadata (including fileId)
      pdf = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId: args.pdfId });
      if (!pdf) {
        throw new Error(`PDF not found with ID: ${args.pdfId}`);
      }

      // 2. Update status to indicate Replicate processing has started
      await ctx.runMutation(internal.pdf.mutations.updateReplicateStatus, {
        pdfId: args.pdfId,
        replicateStatus: "processing",
        replicateProcessingError: undefined, 
      });
      console.log(`Replicate processing started for PDF: ${pdf.filename} (${args.pdfId})`);

      // 3. Retrieve the file content from Convex storage
      const fileData = await ctx.storage.getUrl(pdf.fileId);
      if (!fileData) {
        throw new Error(`PDF file blob not found in storage for fileId: ${pdf.fileId}`);
      }

      // Configuration for Replicate
      const REPLICATE_API_KEY = process.env.REPLICATE_API_TOKEN;
      if (!REPLICATE_API_KEY) {
        throw new Error("Replicate API key (REPLICATE_API_KEY) is not configured in Convex environment variables.");
      }

      const replicateModel = "lucataco/olmocr-7b";
      const replicateModelVersion = "d96720d5a835ed7b48f2951a5e5f4e247ed724f6fd96c6b96b5c7234f635065f";
      console.log(`Processing PDF ${args.pdfId} with ${pdf.pageCount} pages using model ${replicateModel}`);
      
      // Process all pages asynchronously
      console.log(`Starting async processing of all ${pdf.pageCount} pages for PDF ${args.pdfId}`);
      
      // Function to process a single page
      const processPage = async (pageNumber: number): Promise<PageResult> => {
        console.log(`Processing page ${pageNumber} of ${pdf!.pageCount} for PDF ${args.pdfId}`);
        
        const input = {
          pdf: fileData,
          page_number: pageNumber,
          max_new_tokens: 1024
        };
        const MAX_RETRIES = 3;
        let retries = 0;
        let success = false;
        let pageOutput;
        
        while (!success && retries < MAX_RETRIES) {
          try {
            // Call Replicate API for this page
            pageOutput = await replicate.run(
              `${replicateModel}:${replicateModelVersion}`, 
              { input }
            );
            success = true;
          } catch (error: unknown) {
            retries++;
            // Check if it's a rate limit error (429)
            if (error && typeof error === 'object' && 'response' in error && 
                error.response && typeof error.response === 'object' && 
                'status' in error.response && error.response.status === 429 &&
                'headers' in error.response && error.response.headers && 
                typeof error.response.headers === 'object' && 
                'get' in error.response.headers && 
                typeof error.response.headers.get === 'function') {
              const retryAfter = parseInt(error.response.headers.get('retry-after') || '10');
              console.log(`Rate limited when processing page ${pageNumber}. Retrying after ${retryAfter} seconds (attempt ${retries}/${MAX_RETRIES})`);
              // Wait for the specified retry-after time (or default to 10 seconds)
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            } else {
              // For other errors, throw immediately
              throw error;
            }
          }
        }
        
        if (!success) {
          throw new Error(`Failed to process page ${pageNumber} after ${MAX_RETRIES} retries due to rate limits`);
        }
        
        // Extract text from this page's output
        let pageExtractedText = "";
        if (pageOutput) {
          if (typeof pageOutput === "string") {
            pageExtractedText = pageOutput;
          } else if (Array.isArray(pageOutput)) {
            pageExtractedText = pageOutput.join("\n");
          } else if (typeof pageOutput === "object" && pageOutput !== null) {
            const outputObj = pageOutput as Record<string, unknown>;
            if (outputObj.text && typeof outputObj.text === "string") {
              pageExtractedText = outputObj.text;
            } else if (outputObj.text_output && typeof outputObj.text_output === "string") {
              pageExtractedText = outputObj.text_output;
            } else {
              console.warn(`Replicate output for PDF ${args.pdfId} page ${pageNumber} has unknown structure`);
              pageExtractedText = JSON.stringify(pageOutput);
            }
          } else {
            console.warn(`Replicate output for PDF ${args.pdfId} page ${pageNumber} has unexpected type: ${typeof pageOutput}`);
            pageExtractedText = String(pageOutput);
          }
        }
        
        console.log(`Completed processing page ${pageNumber} of ${pdf!.pageCount}. Text length: ${pageExtractedText.length}`);
        
        return {
          pageNumber,
          text: pageExtractedText
        };
      };
      
      // Process in batches with limited concurrency
      const BATCH_SIZE = 3; // Process 3 pages at a time
      const pageResults = [];
      
      for (let i = 0; i < pdf.pageCount; i += BATCH_SIZE) {
        const batch = [];
        // Create a batch of promises
        for (let j = 0; j < BATCH_SIZE && i + j < pdf.pageCount; j++) {
          const pageNumber = i + j + 1; // +1 because pages are 1-indexed
          batch.push(processPage(pageNumber));
        }
        
        // Process this batch concurrently
        console.log(`Processing batch of ${batch.length} pages (${i+1}-${Math.min(i+BATCH_SIZE, pdf.pageCount)})`);
        const batchResults = await Promise.all(batch);
        pageResults.push(...batchResults);
        
        // Optional: add a small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < pdf.pageCount) {
          console.log("Waiting 2 seconds before processing next batch...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Sort the results by page number to ensure correct order
      pageResults.sort((a, b) => a.pageNumber - b.pageNumber);
      
      // Aggregate all pages' results
      const aggregatedText = pageResults.map(page => 
        `--- PAGE ${page.pageNumber} ---\n${page.text}`
      ).join('\n\n');
      
      console.log(`Replicate OCR complete for all ${pdf.pageCount} pages of PDF ${args.pdfId}. Total text length: ${aggregatedText.length}`);

      // Save the aggregated results via internal mutation
      await ctx.runMutation(internal.ocr.replicate.mutations.saveOcrResults, {
        pdfId: args.pdfId,
        fileId: pdf.fileId,
        extractedText: aggregatedText,
        replicateModelId: replicateModel,
        replicateModelVersion,
      });

      // Return success status
      return {
        success: true,
        pdfId: args.pdfId,
        provider: "replicate",
        pageCount: pdf.pageCount,
        textLength: aggregatedText.length,
      };

    } catch (error) {
      console.error(`Replicate OCR failed for PDF ${args.pdfId}:`, error);

      // Update status to 'failed' on any error
      await ctx.runMutation(internal.pdf.mutations.updateReplicateStatus, {
        pdfId: args.pdfId,
        replicateStatus: "failed",
        replicateProcessingError: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        pdfId: args.pdfId,
        provider: "replicate",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});