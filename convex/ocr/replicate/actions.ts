// convex/ocr/replicate/actions.ts
import { action } from "../../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../../_generated/api";
import Replicate from "replicate";
import { Id } from "../../_generated/dataModel";
import { replicate as replicateConfig } from "../../config";

// Add this function at the top to extract OCR text from Replicate responses
// Updated extractOCRText function for ocr/replicate/actions.ts
function extractOCRText(replicateOutput: unknown): string {
  try {
    // Case 1: If the output is already a string that's a JSON representation
    if (typeof replicateOutput === 'string') {
      try {
        // Try to extract content from JSON string inside the string
        // This handles when the API returns a JSON string directly
        const parsedObj = JSON.parse(replicateOutput);
        if (parsedObj && typeof parsedObj.natural_text === 'string') {
          return parsedObj.natural_text;
        }
      } catch (jsonParseError) {
        // If direct JSON parsing fails, look for JSON-like patterns
        const match = replicateOutput.match(/natural_text['"]\s*:\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
          return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
        
        // If we can't parse, just return the string itself
        return replicateOutput;
      }
    }
    
    // Case 2: If the output is an array (which matches the API docs)
    if (Array.isArray(replicateOutput) && replicateOutput.length > 0) {
      const firstElement = replicateOutput[0];
      
      // If the first element is a string, try to parse it as JSON
      if (typeof firstElement === 'string') {
        try {
          const parsedObj = JSON.parse(firstElement);
          if (parsedObj && typeof parsedObj.natural_text === 'string') {
            return parsedObj.natural_text;
          }
        } catch (innerJsonError) {
          // If parsing fails, use regex to extract natural_text
          const match = firstElement.match(/natural_text['"]\s*:\s*['"]([^'"]+)['"]/);
          if (match && match[1]) {
            return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          }
          
          // If we can't parse it, return the string as is
          return firstElement;
        }
      }
    }
    
    // Case 3: If the output has a specific structure we're expecting
    if (replicateOutput && 
        typeof replicateOutput === 'object' && 
        'output' in replicateOutput) {
      const output = (replicateOutput as any).output;
      
      // If output is an array with elements
      if (Array.isArray(output) && output.length > 0) {
        const firstElement = output[0];
        
        // If the first element is a string, try to parse it as JSON
        if (typeof firstElement === 'string') {
          try {
            const parsedObj = JSON.parse(firstElement);
            if (parsedObj && typeof parsedObj.natural_text === 'string') {
              return parsedObj.natural_text;
            }
          } catch (innerJsonError) {
            // Use regex as fallback
            const match = firstElement.match(/natural_text['"]\s*:\s*['"]([^'"]+)['"]/);
            if (match && match[1]) {
              return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            }
            
            // Return string directly as last resort
            return firstElement;
          }
        }
      }
    }
    
    // Last resort: convert to string and try to extract anything useful
    const stringified = JSON.stringify(replicateOutput);
    const match = stringified.match(/natural_text['"]\s*:\s*['"]([^'"]+)['"]/);
    if (match && match[1]) {
      return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    
    // Absolute fallback: return a string representation
    return typeof replicateOutput === 'string' ? replicateOutput : stringified;
    
  } catch (error) {
    console.error("Text extraction error:", error);
    return "Error extracting OCR text";
  }
}

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
          max_new_tokens: 1024,
          temperature: replicateConfig.temperature || 0.1 // Use temperature from config
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
        
        // Extract text from this page's output using our new extraction function
        let pageExtractedText = "";
        if (pageOutput) {
          pageExtractedText = extractOCRText(pageOutput);
          console.log(`Extracted text from page ${pageNumber}, length: ${pageExtractedText.length}`);
        }
        
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