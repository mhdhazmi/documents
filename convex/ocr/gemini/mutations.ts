// convex/ocr/gemini/mutations.ts
import { internalMutation } from "../../_generated/server";
import { v } from "convex/values";

// Internal mutation to save results from Gemini OCR processing.
export const saveOcrResults = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
    fileId: v.string(), 
    extractedText: v.string(),
    confidenceScore: v.optional(v.number()), 
    geminiModel: v.string(), 
  },
  handler: async (ctx, args) => {
    
    const existingResult = await ctx.db
        .query("geminiOcrResults")
        .withIndex("by_pdf_id", q => q.eq("pdfId", args.pdfId))
        .first();

    let ocrResultId;
    if (existingResult) {
        console.warn(`Overwriting existing Gemini OCR results for PDF ID: ${args.pdfId}`);
        await ctx.db.patch(existingResult._id, {
            extractedText: args.extractedText,
            confidenceScore: args.confidenceScore,
            processedAt: Date.now(),
            geminiModel: args.geminiModel,
        });
        ocrResultId = existingResult._id;
        // Option 2: Throw error or return existing ID if overwrite is not desired
    } else {
        ocrResultId = await ctx.db.insert("geminiOcrResults", {
          pdfId: args.pdfId,
          fileId: args.fileId, 
          extractedText: args.extractedText,
          confidenceScore: args.confidenceScore,
          processedAt: Date.now(), 
          geminiModel: args.geminiModel,
        });
    }

    // 2. Update the main PDF document status to indicate Gemini processing is complete.
    await ctx.db.patch(args.pdfId, {
      status: "processed", 
      processingError: undefined, 
    });

    console.log(`Saved Gemini OCR results for PDF ${args.pdfId}. Result ID: ${ocrResultId}`);

    return ocrResultId;
  },
});