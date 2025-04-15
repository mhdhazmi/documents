// convex/ocr/replicate/mutations.ts
import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

// Internal mutation to save results from Replicate OCR processing.
export const saveOcrResults = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    fileId: v.string(), 
    extractedText: v.string(),
    replicateModelId: v.string(), 
    replicateModelVersion: v.string(), 
  },
  handler: async (ctx, args) => {
     const existingResult = await ctx.db
        .query("replicateOcrResults")
        .withIndex("by_pdf_id", q => q.eq("pdfId", args.pdfId))
        .first();

    let ocrResultId;
    if (existingResult) {
        console.warn(`Overwriting existing Replicate OCR results for PDF ID: ${args.pdfId}`);
        await ctx.db.patch(existingResult._id, {
             extractedText: args.extractedText,
             processedAt: Date.now(),
             replicateModelId: args.replicateModelId,
             replicateModelVersion: args.replicateModelVersion,
        });
        ocrResultId = existingResult._id;
        // Option 2: Prevent overwrite
    } else {
        // Insert new Replicate OCR results document
        ocrResultId = await ctx.db.insert("replicateOcrResults", {
          pdfId: args.pdfId,
          fileId: args.fileId,
          extractedText: args.extractedText,
          processedAt: Date.now(),
          replicateModelId: args.replicateModelId,
          replicateModelVersion: args.replicateModelVersion,
        });
    }


    // 2. Update the PDF document's Replicate-specific status to 'processed'.
    await ctx.db.patch(args.pdfId, {
      replicateStatus: "processed",
      replicateProcessingError: undefined, 
    });

    console.log(`Saved Replicate OCR results for PDF ${args.pdfId}. Result ID: ${ocrResultId}`);

    return ocrResultId;
  },
});