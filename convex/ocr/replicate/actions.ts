// convex/ocr/replicate/actions.ts
import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import Replicate from "replicate";
import { Id } from "../../_generated/dataModel";
import { replicate as replicateConfig } from "../../config";


const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Action to process a PDF with Replicate OCR
export const processPdfWithOcr = action({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args) => {
    try {

        const current = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId: args.pdfId });
        if (!current ) {
          throw new Error("PDF must be uploaded before OCR.");
        }
        
  
        // 1. Update PDF status to "processing" for Gemini
        await ctx.runMutation(internal.ocr.replicate.mutations.updateOcrStatus, {
          pdfId: args.pdfId as Id<"pdfs">,
          ocrStatus: "processing",
        });
      console.log(`Replicate processing started for PDF:  (${args.pdfId})`);

      // 3. Retrieve the file content from Convex storage
      const fileData = await ctx.storage.getUrl(current.fileId);
      if (!fileData) {
        throw new Error(`PDF file blob not found in storage for fileId: ${current.fileId}`);
      }

      // Configuration for Replicate
      const REPLICATE_API_KEY = process.env.REPLICATE_API_TOKEN;
      if (!REPLICATE_API_KEY) {
        throw new Error("Replicate API key (REPLICATE_API_KEY) is not configured in Convex environment variables.");
      }

      console.log(`Processing PDF ${args.pdfId} with ${current.pageCount} pages using model ${replicateConfig.model}`);
      
      // Process all pages asynchronously
      console.log(`Starting async processing of all ${current.pageCount} pages for PDF ${args.pdfId}`);
      
      // Function to process a single page
      const processPage = async (pageNumber: number) => {
        console.log(`Processing page ${pageNumber} of ${current!.pageCount} for PDF ${args.pdfId}`);
        
        const input = {
          pdf: fileData,
          page_number: pageNumber,
          max_new_tokens: 1024
        };
        
        let retries = 0;
        let success = false;
        let pageOutput;
        
        while (!success && retries < replicateConfig.maxRetries) {
          try {
            // Call Replicate API for this page
            pageOutput = await replicate.run(
              `${replicateConfig.model}:${replicateConfig.modelVersion}` as `${string}/${string}:${string}`, 
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
              const retryAfter = parseInt(error.response.headers.get('retry-after') || String(replicateConfig.retryDelayMs / 1000));
              console.log(`Rate limited when processing page ${pageNumber}. Retrying after ${retryAfter} seconds (attempt ${retries}/${replicateConfig.maxRetries})`);
              // Wait for the specified retry-after time (or default to configured time)
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            } else {
              // For other errors, throw immediately
              throw error;
            }
          }
        }
        
        if (!success) {
          throw new Error(`Failed to process page ${pageNumber} after ${replicateConfig.maxRetries} retries due to rate limits`);
        }
        
        // Extract text from this page's output
        let pageExtractedText = "";
        if (pageOutput) {
          if (typeof pageOutput === "string") {
            try {
              // Try to parse the string as JSON first - Replicate might return a stringified JSON
              const stringifiedOutput = pageOutput as string;
              // Check if it looks like a JSON string array
              if (stringifiedOutput.startsWith('[') && stringifiedOutput.endsWith(']')) {
                const parsed = JSON.parse(stringifiedOutput);
                // If it's an array of strings, join them
                if (Array.isArray(parsed)) {
                  // Check if any element contains a JSON with natural_text
                  for (const item of parsed) {
                    try {
                      // Try to parse each item as JSON if it's a string
                      if (typeof item === 'string') {
                        const parsedItem = JSON.parse(item);
                        if (parsedItem && parsedItem.natural_text) {
                          pageExtractedText = parsedItem.natural_text;
                          break;
                        }
                      }
                    } catch {
                      // If it's not valid JSON, just use the string itself
                      continue;
                    }
                  }
                  
                  // If we didn't find natural_text, just join the array elements
                  if (!pageExtractedText) {
                    pageExtractedText = parsed.join("\n");
                  }
                }
              } else {
                pageExtractedText = stringifiedOutput;
              }
            } catch {
              // If parsing fails, use the string as is
              pageExtractedText = pageOutput;
            }
          } else if (Array.isArray(pageOutput)) {
            // Handle array output - try to find any item containing natural_text
            for (const item of pageOutput) {
              if (typeof item === 'string') {
                try {
                  const parsedItem = JSON.parse(item);
                  if (parsedItem && parsedItem.natural_text) {
                    pageExtractedText = parsedItem.natural_text;
                    break;
                  }
                } catch {
                  // Not a valid JSON string, continue to the next item
                  continue;
                }
              }
            }
            
            // If we didn't find natural_text, just join the array elements
            if (!pageExtractedText) {
              pageExtractedText = pageOutput.join("\n");
            }
          } else if (typeof pageOutput === "object" && pageOutput !== null) {
            // Direct object output
            const outputObj = pageOutput as Record<string, unknown>;
            // First check if the output field exists and contains natural_text
            if (outputObj.output && typeof outputObj.output === "string") {
              try {
                // Try to parse output as JSON string array
                const outputString = outputObj.output as string;
                if (outputString.startsWith('[') && outputString.endsWith(']')) {
                  const parsed = JSON.parse(outputString);
                  if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                      if (typeof item === 'string') {
                        try {
                          const parsedItem = JSON.parse(item);
                          if (parsedItem && parsedItem.natural_text) {
                            pageExtractedText = parsedItem.natural_text;
                            break;
                          }
                        } catch {
                          continue;
                        }
                      }
                    }
                  }
                }
              } catch {
                // If parsing fails, use output as is
                pageExtractedText = outputObj.output as string;
              }
            }
            // Check if natural_text is directly available
            else if (outputObj.natural_text && typeof outputObj.natural_text === "string") {
              pageExtractedText = outputObj.natural_text as string;
            }
            // Fall back to text or text_output
            else if (outputObj.text && typeof outputObj.text === "string") {
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
        
        console.log(`Completed processing page ${pageNumber} of ${current!.pageCount}. Text length: ${pageExtractedText.length}`);
        
        return {
          pageNumber,
          text: pageExtractedText
        };
      };
      
      // Process in batches with limited concurrency
      const pageResults = [];
      
      for (let i = 0; i < current.pageCount; i += replicateConfig.batchSize) {
        const batch = [];
        // Create a batch of promises
        for (let j = 0; j < replicateConfig.batchSize && i + j < current.pageCount; j++) {
          const pageNumber = i + j + 1; // +1 because pages are 1-indexed
          batch.push(processPage(pageNumber));
        }
        
        // Process this batch concurrently
        console.log(`Processing batch of ${batch.length} pages (${i+1}-${Math.min(i+replicateConfig.batchSize, current.pageCount)})`);
        const batchResults = await Promise.all(batch);
        pageResults.push(...batchResults);
        
        // Optional: add a small delay between batches to avoid rate limits
        if (i + replicateConfig.batchSize < current.pageCount) {
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
      
      console.log(`Replicate OCR complete for all ${current.pageCount} pages of PDF ${args.pdfId}. Total text length: ${aggregatedText.length}`);

      // Save the aggregated results via internal mutation
      await ctx.runMutation(internal.ocr.replicate.mutations.updateOcrResutls, {
        pdfId: args.pdfId,
        extractedText: aggregatedText,
        ocrStatus: "completed",
      });

      // Immediately trigger OpenAI cleanup without waiting for other OCR services
      console.log(`Immediately triggering OpenAI cleanup for Replicate OCR results of PDF ${args.pdfId}`);
 

    } catch (error) {
      console.error(`Replicate OCR failed for PDF ${args.pdfId}:`, error);

      // Update status to 'failed' on any error
      await ctx.runMutation(internal.ocr.replicate.mutations.updateOcrStatus, {
        pdfId: args.pdfId,
        ocrStatus: "failed",
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