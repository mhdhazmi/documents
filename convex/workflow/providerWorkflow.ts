// convex/workflows/providerWorkflow.ts
import { workflow } from "./index";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";

export const providerWorkflow = workflow.define({
  args: {
    pageId: v.id("pages"),
    provider: v.union(v.literal("gemini"), v.literal("replicate")),
  },

  handler: async (step, { pageId, provider }): Promise<void> => {
    // 1. OCR with the chosen provider
    if (provider === "gemini") {
      await step.runAction(
        internal.ocr.gemini.actions.processPageWithOcr,
        { pageId },
        { 
            retry: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
            name: `GeminiOCR-Page-${pageId}` 
          }
      );
    } else {
      await step.runAction(
        internal.ocr.replicate.actions.processPageWithOcr,
        { pageId },
        { 
            retry: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
            name: `ReplicateOCR-Page-${pageId}` 
          }
      );
    }

    await step.runAction(
        internal.ocr.openai.actions.cleanPage,
        { pageId, source: provider },
        {
          retry: { maxAttempts: 2, initialBackoffMs: 1000, base: 2 },
          name: `CleanPage-${provider}-${pageId}`
        }
      );
    },
  });




export const kickoffproviderWorkflow = internalMutation({
    args: {
        pageId: v.id("pages"),
        provider: v.union(v.literal("gemini"), v.literal("replicate")),
    },
    handler: async (ctx, {pageId, provider}) => {
      await workflow.start(
        ctx,
        internal.workflow.providerWorkflow.providerWorkflow,
        { pageId, provider },
      );
    },
  });