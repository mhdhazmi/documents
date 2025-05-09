// convex/pdf/actions.ts (new file)
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { splitPdf } from "../utils/pdfSplitter";
import { Id } from "../_generated/dataModel";

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