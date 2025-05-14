import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { asyncMap } from "modern-async";
import { api, internal } from "../_generated/api";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { embedding as embeddingConfig } from "../config";
import { Id } from "../_generated/dataModel";

export const createChunks = internalMutation({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, arg) => {
    const pdf = await ctx.db.get(arg.pdfId);
    if (!pdf) {
      throw new Error("PDF not found");
    }
    console.log("Creating chunks for PDF:", pdf._id);

    const existingChunks = await ctx.db
      .query("chunks")
      .withIndex("byPdfId", (q) => q.eq("pdfId", arg.pdfId))
      .first();

    if (existingChunks) {
      console.log(
        `Chunks already exist for PDF ${arg.pdfId}, skipping creation`
      );
      return;
    }

    const cleanedPages = await ctx.db
      .query("openaiCleanedPage")
      .filter((q) => q.eq(q.field("cleaningStatus"), "completed"))
      .collect();

    const pdfPages = new Map<Id<"pages">, string>();

    for (const cleanedPage of cleanedPages) {
      const page = await ctx.db.get(cleanedPage.pageId);
      if (page && page.pdfId === arg.pdfId) {
        pdfPages.set(cleanedPage.pageId, cleanedPage.cleanedText);
      }
    }

    console.log(`Found ${pdfPages.size} cleaned pages for PDF ${arg.pdfId}`);

    if (pdfPages.size === 0) {
      console.log("No cleaned pages found for this PDF");
      
      // The legacy openaiOcrResults table has been removed
      // No fallback is possible anymore - we rely entirely on page-level processing
      console.log("PDF pages must be processed before chunking is possible");
      return;
    }

    // Create page-level chunks
    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: embeddingConfig.chunking.chunkSize,
      chunkOverlap: embeddingConfig.chunking.chunkOverlap,
    });

    let totalChunks = 0;

    // Process each page
    for (const [pageId, cleanedText] of pdfPages.entries()) {
      const chunks = await splitter.splitText(cleanedText);

      await asyncMap(chunks, async (chunk) => {
        await ctx.db.insert("chunks", {
          pdfId: arg.pdfId,
          pageId: pageId, // Page-specific chunk
          text: chunk,
          embeddingId: null,
        });
      });

      console.log(`Created ${chunks.length} chunks for page ${pageId}`);
      totalChunks += chunks.length;
    }

    console.log(
      `Created ${totalChunks} page-level chunks for PDF ${arg.pdfId}`
    );

    // Also create document-level chunks as a fallback
    // This maintains backward compatibility and helps with broad queries
    console.log("Creating additional document-level chunks...");

    const allPageTexts = Array.from(pdfPages.values()).join("\n\n");
    const docChunks = await splitter.splitText(allPageTexts);

    await asyncMap(docChunks, async (chunk) => {
      await ctx.db.insert("chunks", {
        pdfId: arg.pdfId,
        pageId: null, // Document-level chunk
        text: chunk,
        embeddingId: null,
      });
    });

    console.log(
      `Created ${docChunks.length} document-level chunks for backward compatibility`
    );
    console.log(`Total chunks created: ${totalChunks + docChunks.length}`);
  },
});

export const getChunkStats = internalQuery({
  args: {
    pdfId: v.id("pdfs"),
  },
  handler: async (ctx, args) => {
    const allChunks = await ctx.db
      .query("chunks")
      .withIndex("byPdfId", (q) => q.eq("pdfId", args.pdfId))
      .collect();

    const pageChunks = allChunks.filter((chunk) => chunk.pageId !== null);
    const docChunks = allChunks.filter((chunk) => chunk.pageId === null);
    const chunksWithEmbeddings = allChunks.filter(
      (chunk) => chunk.embeddingId !== null
    );

    return {
      total: allChunks.length,
      pageLevel: pageChunks.length,
      documentLevel: docChunks.length,
      withEmbeddings: chunksWithEmbeddings.length,
      pagesRepresented: new Set(pageChunks.map((c) => c.pageId)).size,
    };
  },
});

export async function embedTexts(texts: string[]) {
  if (texts.length === 0) return [];

  console.log(`Embedding ${texts.length} texts...`);

  try {
    const { embeddings } = await embedMany({
      model: openai.embedding(embeddingConfig.model),
      values: texts,
    });

    console.log(`Successfully created ${embeddings.length} embeddings`);
    return embeddings;
  } catch (error) {
    console.error("Error creating embeddings:", error);
    throw error;
  }
}

export const chunksNeedingEmbedding = internalQuery({
  args: { pdfId: v.id("pdfs") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("byPdfId", (q) => q.eq("pdfId", args.pdfId))
      .filter((q) => q.eq(q.field("embeddingId"), null))
      .collect();
    return chunks;
  },
});

export const embedList = internalAction({
  args: {
    documentIds: v.array(v.id("pdfs")),
  },
  handler: async (ctx, { documentIds }) => {
    // Get all chunks needing embedding, with their associated PDF IDs
    type ChunkWithPdfId = {
      _id: Id<"chunks">;
      pdfId: Id<"pdfs">;
      pageId: Id<"pages"> | null;
      text: string;
      embeddingId: Id<"embeddings"> | null;
    };

    const chunksWithPdfIds: ChunkWithPdfId[] = [];

    for (const pdfId of documentIds) {
      // Defensive programming: skip if no documentIds
      if (!documentIds.length) continue;

      const chunks = await ctx.runQuery(
        internal.ingest.ingest.chunksNeedingEmbedding,
        { pdfId }
      );

      // FIX: Remove the extra dot - spread the inner map correctly
      if (chunks && chunks.length > 0) {
        chunksWithPdfIds.push(
          ...chunks.map((chunk: ChunkWithPdfId) => ({ ...chunk, pdfId })) // ✅ Added type annotation
        );
      }
    }

    console.log(
      `Embedding ${chunksWithPdfIds.length} chunks across ${documentIds.length} PDFs`
    );

    // Only process if we have chunks
    if (chunksWithPdfIds.length === 0) {
      console.log("No chunks to embed");
      return;
    }

    try {
      // Get embeddings for all chunk texts
      const embeddings = await embedTexts(
        chunksWithPdfIds.map((chunk) => chunk.text)
      );

      // Save embeddings with their correct chunk and PDF IDs
      await asyncMap(embeddings, async (embedding, i) => {
        const chunk = chunksWithPdfIds[i];
        await ctx.runMutation(internal.ingest.ingest.addEmbedding, {
          chunkId: chunk._id,
          embedding,
          pdfId: chunk.pdfId,
          pageId: chunk.pageId, // ✅ Include pageId for page-level tracking
        });
      });

      console.log(`Successfully embedded ${embeddings.length} chunks`);
    } catch (error) {
      console.error("Error in embedList:", error);
      throw error;
    }
  },
});

export const addEmbedding = internalMutation({
  args: {
    chunkId: v.id("chunks"),
    embedding: v.array(v.number()),
    pdfId: v.id("pdfs"),
    pageId: v.optional(v.union(v.id("pages"), v.null())), // New optional pageId
  },
  handler: async (ctx, args) => {
    // Get the chunk to check if it already has an embedding
    const chunk = await ctx.db.get(args.chunkId);
    if (!chunk) {
      console.error("Chunk not found:", args.chunkId);
      return;
    }

    // Skip if the chunk already has an embedding
    if (chunk.embeddingId !== null) {
      console.log("Chunk already has embedding, skipping:", args.chunkId);
      return;
    }

    // Create the embedding with pageId support
    const embeddingId = await ctx.db.insert("embeddings", {
      embedding: args.embedding,
      chunkId: args.chunkId,
      pdfId: args.pdfId,
      pageId: args.pageId || null, // Store the pageId from chunk
    });

    await ctx.db.patch(args.chunkId, { embeddingId });

    console.log(
      `Created embedding for chunk ${args.chunkId} (${args.pageId ? `page ${args.pageId}` : "document level"})`
    );
  },
});

export const chunkAndEmbed = action({
  args: { pdfId: v.id("pdfs") },
  handler: async (
    ctx,
    args
  ): Promise<
    | {
        success: boolean;
        pdfId: Id<"pdfs">;
        source: "gemini" | "replicate";
        timestamp: number;
        status: string;
      }
    | undefined
  > => {
    console.log(`Starting chunkAndEmbed orchestration for PDF: ${args.pdfId}`);

    try {
      // First check if embedding is already complete to avoid duplicate work
      const chunkStats = await ctx.runQuery(internal.ingest.ingest.getChunkStats, { 
        pdfId: args.pdfId 
      });
      
      // If we already have full embedding, skip the process
      if (chunkStats.total > 0 && chunkStats.withEmbeddings === chunkStats.total) {
        console.log(
          `Skipping chunking/embedding for PDF ${args.pdfId} - already complete ` +
          `(${chunkStats.withEmbeddings}/${chunkStats.total} chunks embedded)`
        );
        // Use gemini as default source for type safety
        return {
          success: true,
          pdfId: args.pdfId,
          source: "gemini", // Default to gemini for type safety
          timestamp: Date.now(),
          status: "already_completed"
        };
      }
      
      // ① Wait until *all* pages are cleaned
      // We'll check both Gemini and Replicate sources
      const geminiReady: boolean = await ctx.runQuery(
        internal.concatenate.queries.areAllPagesComplete,
        { pdfId: args.pdfId, source: "gemini" }
      );

      const replicateReady: boolean = await ctx.runQuery(
        internal.concatenate.queries.areAllPagesComplete,
        { pdfId: args.pdfId, source: "replicate" }
      );

      // For now, we proceed if either source is complete
      // (This can be configured to wait for both if needed)
      if (!geminiReady && !replicateReady) {
        console.log(
          `Pages not yet ready for PDF ${args.pdfId}. Gemini: ${geminiReady}, Replicate: ${replicateReady}`
        );
        return;
      }

      const readySource: "gemini" | "replicate" = geminiReady
        ? "gemini"
        : "replicate";
      console.log(`All pages complete for PDF ${args.pdfId} using ${readySource}`);

      // ② Create/update chunks
      console.log(`Creating chunks for PDF ${args.pdfId}...`);
      await ctx.runMutation(internal.ingest.ingest.createChunks, {
        pdfId: args.pdfId,
      });

      // ③ Schedule embedding
      console.log(`Scheduling embedding for PDF ${args.pdfId}...`);
      await ctx.scheduler.runAfter(0, internal.ingest.ingest.embedList, {
        documentIds: [args.pdfId],
      });

      console.log(
        `Successfully orchestrated chunking and embedding for PDF ${args.pdfId}`
      );

      // Optional: Return status for monitoring
      return {
        success: true,
        pdfId: args.pdfId,
        source: readySource,
        timestamp: Date.now(),
        status: "processing_started"
      };
    } catch (error) {
      console.error(
        `Error in chunkAndEmbed orchestration for PDF ${args.pdfId}:`,
        error
      );
      throw error;
    }
  },
});

export const getEmbedding = internalQuery({
  args: { pdfId: v.id("pdfs") },
  handler: async (ctx, args) => {
    const embedding = await ctx.db
      .query("embeddings")
      .withIndex("byPdfId", (q) => q.eq("pdfId", args.pdfId))
      .first();
    return embedding;
  },
});

export const triggerChunkAndEmbedFromPageCleaning = action({
  args: {
    pageId: v.id("pages"),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  },
  handler: async (ctx, args): Promise<void> => {
    // This function has been refactored to be a no-op to avoid duplicate embedding triggers
    // It remains as a function for backward compatibility
    // The concatenateWorkflow now exclusively handles chunking and embedding

    // Get the PDF ID from the page for logging purposes
    const page = await ctx.runQuery(api.pdf.queries.getPdfPage, {
      pageId: args.pageId,
    });

    if (!page) {
      console.error(`Page not found: ${args.pageId}`);
      return;
    }

    console.log(
      `[DEPRECATED] Page cleaning completed for page ${args.pageId} ` +
      `(PDF: ${page.pdfId}) - no action taken as embedding is now handled exclusively by concatenateWorkflow`
    );
    
    // No action taken - this avoids duplicate embedding triggers
    // The concatenateWorkflow.ts will handle embedding through its workflow
  },
});

// Utility to check orchestration status
export const getOrchestrationStatus = action({
  args: { pdfId: v.id("pdfs") },
  handler: async (
    ctx,
    args
  ): Promise<{
    pdfId: Id<"pdfs">;
    readiness: {
      gemini: boolean;
      replicate: boolean;
    };
    chunking: {
      hasChunks: boolean;
      pageLevel: number;
      documentLevel: number;
      withEmbeddings: number;
    };
    status:
      | "completed"
      | "embedding_pending"
      | "chunking_pending"
      | "pages_pending";
  }> => {
    // ✅ Added explicit return type
    // Check readiness status
    const geminiReady = await ctx.runQuery(
      internal.concatenate.queries.areAllPagesComplete,
      { pdfId: args.pdfId, source: "gemini" }
    );

    const replicateReady = await ctx.runQuery(
      internal.concatenate.queries.areAllPagesComplete,
      { pdfId: args.pdfId, source: "replicate" }
    );

    // Check if chunks exist
    const chunkStats = await ctx.runQuery(
      internal.ingest.ingest.getChunkStats,
      { pdfId: args.pdfId }
    );

    return {
      pdfId: args.pdfId,
      readiness: {
        gemini: geminiReady,
        replicate: replicateReady,
      },
      chunking: {
        hasChunks: chunkStats.total > 0,
        pageLevel: chunkStats.pageLevel,
        documentLevel: chunkStats.documentLevel,
        withEmbeddings: chunkStats.withEmbeddings,
      },
      // Determine overall status
      status:
        chunkStats.withEmbeddings > 0
          ? "completed"
          : chunkStats.total > 0
            ? "embedding_pending"
            : geminiReady || replicateReady
              ? "chunking_pending"
              : "pages_pending",
    };
  },
});
