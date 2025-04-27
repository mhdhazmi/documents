import { mutation } from "./_generated/server";

import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {  internalAction } from "./_generated/server";

export const workflowOrch = internalAction({
    args: {
        pdfId: v.id("pdfs"),
    },
    handler: async (ctx, args) => {
        
await Promise.allSettled([     
 ctx.scheduler.runAfter(0, api.ocr.gemini.actions.processPdfWithOcr, { pdfId: args.pdfId }),
 ctx.scheduler.runAfter(0, api.ocr.replicate.actions.processPdfWithOcr, { pdfId: args.pdfId })
])
  

    // await ctx.runAction(api.ocr.openai.actions.cleanupOcrText, { pdfId: args.pdfId, source: "gemini" });
    // await ctx.runAction(api.ocr.openai.actions.cleanupOcrText, { pdfId: args.pdfId, source: "replicate" });
    // await ctx.runAction(api.ingest.ingest.chunkAndEmbed, { pdfId: args.pdfId });
    }
});


export const workflowOrchMutation = mutation({
    args: {
        pdfId: v.id("pdfs"),
    },
    handler: async (ctx, args) => {
        await ctx.scheduler.runAfter(0, internal.workflowOrch.workflowOrch, {pdfId: args.pdfId})
    }
})
