// // convex/ocr/actions.ts
// import { action, mutation } from "../_generated/server";
// import { v } from "convex/values";
// import { api, internal } from "../_generated/api";
// import { Id } from "../_generated/dataModel";



// interface ProcessPdfResult {
//   success: boolean;
//   pdfId: Id<"pdfs">;
//   provider: string;
//   textLength?: number;
//   error?: string;
// }

// interface OcrServiceResult {
//   status: "fulfilled" | "rejected" | "unknown";
//   value?: ProcessPdfResult;
//   error?: string;
// }

// interface MultipleOcrResult {
//   pdfId: Id<"pdfs">;
//   gemini: OcrServiceResult;
//   replicate: OcrServiceResult;
//   status?: "failed";
//   error?: string;
// }

// export const processWithMultipleOcrMutation = mutation({
//   args: {
//     pdfId: v.id("pdfs")
//   },
//   handler: async (ctx, args) => {
//     // Mutations cannot directly run actions, so we schedule it to run after 0ms
//     await ctx.scheduler.runAfter(0, api.ocr.actions.processWithMultipleOcr, { pdfId: args.pdfId });
   
  
    
//   }
// });


// // Action to trigger both OCR services in parallel for a given PDF
// export const processWithMultipleOcr = action({
//   args: {
//     pdfId: v.id("pdfs")
//   },
//   handler: async (ctx, args) => {
    
      
//       return results;

//     } catch (error: unknown) {
//       console.error(`Error in processWithMultipleOcr action for PDF ${args.pdfId}:`, error);

//       return {
//         pdfId: args.pdfId,
//         status: "failed",
//         error: error instanceof Error ? error.message : String(error),
//         gemini: { status: 'unknown' as const },
//         replicate: { status: 'unknown' as const },
//       };
//     }
//   }
// });