// convex/pdf/actions.ts
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { splitPdf } from "../utils/pdfSplitter";
import { Id } from "../_generated/dataModel";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const splitPdfIntoPages = internalAction({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args): Promise<Id<"pages">[]> => {
    // Skip if feature flag is not enabled


    try {
      // Get the PDF data
      const pdf = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId: args.pdfId });
      if (!pdf) {
        throw new Error(`PDF not found for ID: ${args.pdfId}`);
      }

      // Fetch the PDF file
      const fileUrl = await ctx.storage.getUrl(pdf.fileId);
      
      
      if (!fileUrl) {
        throw new Error(`Could not get file URL for fileId: ${pdf.fileId}`);
      }

      // Download the PDF
      const response = await fetch(fileUrl);
      const pdfBuffer = await response.arrayBuffer();
      
      // Split into pages
      const pageBlobs = await splitPdf(pdfBuffer);
      console.log(`Split PDF into ${pageBlobs.length} pages`);
      
      // Store each page and create database entries
      const pageIds = [];
      
      for (let i = 0; i < pageBlobs.length; i++) {
        const pageNumber = i + 1;
        const pageBlob = pageBlobs[i];
        
        // Store the page in Convex storage
        const pageFileId = await ctx.storage.store(pageBlob);
        
        // Insert page record
        const pageId: Id<"pages"> = await ctx.runMutation(internal.pdf.mutations.savePdfPage, {
          pdfId: args.pdfId,
          pageNumber, 
          fileId: pageFileId,
          // Optional width/height could be added here if extracted
        });
        
        pageIds.push(pageId);
      }
      
      // Update the pageCount in the parent PDF if needed
      await ctx.runMutation(internal.pdf.mutations.updatePdfPageCount, {
        pdfId: args.pdfId,
        pageCount: pageBlobs.length
      });
      console.log(`Updated pageCount for PDF ${args.pdfId} to ${pageBlobs.length}`);
      console.log(`Page IDs: ${pageIds}`);
      return pageIds;
    } catch (error) {
      console.error(`Error in splitPdfIntoPages for PDF ${args.pdfId}:`, error);
      throw error;
    }
  },
});

// Generate a summary for the PDF using AI
export const generateSummary = internalAction({
  args: {
    pdfId: v.id("pdfs"),
    summaryId: v.id("pdfSummaries"),
  },
  handler: async (ctx, { pdfId, summaryId }) => {
    try {
      // Mark summary status as processing
      await ctx.runMutation(internal.pdf.mutations.updateSummaryStatus, {
        summaryId,
        status: "processing",
      });

      // Try to get text in this preferred order:
      // 1. OpenAI cleaned results (fastest if available)
      // 2. Concatenated text from gemini or replicate
      // 3. Raw text from pages
      
      let fullText = "";
      
      // METHOD 1: Legacy OpenAI cleaned results approach has been removed
      // The openaiOcrResults table no longer exists
      console.log(`Using only page-level approach to get text for PDF ${pdfId}`);
      // Skip directly to METHOD 2: Concatenated text
      
      // METHOD 2: If no OpenAI results, try concatenated text
      if (!fullText) {
        try {
          // Try gemini first
          fullText = await ctx.runQuery(internal.concatenate.queries.getConcatenatedText, {
            pdfId,
            source: "gemini",
          });
          
          if (fullText) {
            console.log(`Using concatenated gemini text for PDF ${pdfId}`);
          } else {
            // Try replicate as fallback
            fullText = await ctx.runQuery(internal.concatenate.queries.getConcatenatedText, {
              pdfId,
              source: "replicate",
            });
            
            if (fullText) {
              console.log(`Using concatenated replicate text for PDF ${pdfId}`);
            }
          }
        } catch (error) {
          console.log(`Error getting concatenated text for PDF ${pdfId}: ${error}`);
        }
      }
      
      // If still no text, throw error
      if (!fullText) {
        throw new Error("No processed text found for summarization");
      }

      // Get PDF metadata
      const pdf = await ctx.runQuery(api.pdf.queries.getPdf, { pdfId });
      if (!pdf) {
        throw new Error(`PDF not found for ID: ${pdfId}`);
      }

      // Use even shorter text input by truncating if too long
      // This dramatically speeds up processing while maintaining quality
      const maxTextLength = 15000; // Limit text to ~15K chars for faster processing
      if (fullText.length > maxTextLength) {
        fullText = fullText.substring(0, maxTextLength) + "...";
        console.log(`Truncated text to ${maxTextLength} chars for faster summary generation`);
      }

      // Use a shorter, more focused prompt for faster generation
      const systemPrompt = `Summarize this document titled "${pdf.filename}" in 2-3 short paragraphs. 
      First provide a summary in Arabic, then a brief English summary immediately after. 
      Focus only on the main points. Be concise and direct.`;
      
      // Use Vercel AI SDK with fast model
      let summaryText = "";
      const result = streamText({
        model: openai("gpt-4o-mini"), // Use mini model for fastest generation
        temperature: 0.1, // Lower temperature for more consistent, focused output
        maxTokens: 1000, // Limit output tokens to ensure fast completion
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a summary of the following document text:\n\n${fullText}` },
        ],
      });

      // More efficient database updates - only update twice total
      // Once at halfway point and once at the end
      let updateThreshold = 200; // Only update after collecting 200+ characters
      
      for await (const chunk of result.textStream) {
        summaryText += chunk;
        
        // Only update once we have a substantial amount of text
        if (summaryText.length > updateThreshold && summaryText.length < 500) {
          await ctx.runMutation(internal.pdf.mutations.updateSummary, {
            summaryId,
            summary: summaryText,
          });
          // Set threshold really high so we only update one more time at the end
          updateThreshold = 9999999;
        }
      }

      // Final update with completed status
      await ctx.runMutation(internal.pdf.mutations.updateSummary, {
        summaryId,
        summary: summaryText,
        status: "completed",
      });

      return { success: true };
    } catch (error) {
      console.error(`Error generating summary for PDF ${pdfId}:`, error);
      
      // Update the status to failed
      await ctx.runMutation(internal.pdf.mutations.updateSummary, {
        summaryId,
        status: "failed",
        summary: "Error generating summary",
      });
      
      throw error;
    }
  },
});