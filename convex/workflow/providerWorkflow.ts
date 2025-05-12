// convex/workflows/providerWorkflow.ts
import { workflow } from "./index";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";

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
          name: `GeminiOCR-Page-${pageId}`,
        }
      );
    } else {
      await step.runAction(
        internal.ocr.replicate.actions.processPageWithOcr,
        { pageId },
        {
          retry: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
          name: `ReplicateOCR-Page-${pageId}`,
        }
      );
    }

    // 2. Clean the OCR results using the HTTP endpoint
    await step.runAction(
      internal.ocr.openai.actions.cleanPage,
      { pageId, source: provider },
      {
        retry: { maxAttempts: 3, initialBackoffMs: 2000, base: 2 },
        name: `CleanPageHTTP-${provider}-${pageId}`,
      }
    );

    // 3. NEW: Trigger chunkAndEmbed orchestration check
    await step.runAction(
      api.ingest.ingest.triggerChunkAndEmbedFromPageCleaning,
      { pageId, source: provider },
      {
        name: `TriggerOrchestration-${provider}-${pageId}`,
      }
    );
  },
});

export const kickoffproviderWorkflow = internalMutation({
  args: {
    pageId: v.id("pages"),
    provider: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, { pageId, provider }) => {
    await workflow.start(
      ctx,
      internal.workflow.providerWorkflow.providerWorkflow,
      { pageId, provider }
    );
  },
});
