import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { asyncMap } from "modern-async";
import { internal } from "../_generated/api";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { embeddingModel } from "../config";
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
        
        const geminiTextId = await ctx.db
        .query("openaiOcrResults")
        .withIndex("by_pdf_id", q => 
            q.eq("pdfId", arg.pdfId))
        .first();

        if (!geminiTextId) {
            throw new Error("No transcription text found for PDF");
        }

        const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
            chunkSize: 2000,
            chunkOverlap: 100,
        });
        const chunks = await splitter.splitText(geminiTextId.cleanedText);
        await asyncMap(chunks, async (chunk) => {
        await ctx.db.insert("chunks", {
            pdfId: arg.pdfId,
                text: chunk,
                embeddingId: null,
            });

         });
    }
});

export async function embedTexts(texts: string[]) {
    if (texts.length === 0) return [];

    const {embeddings} = await embedMany({
        model: openai.embedding(embeddingModel),
        values: texts,
    })
    return embeddings
}

  export const chunksNeedingEmbedding = internalQuery({
    args:{pdfId: v.id("pdfs")},
    handler: async (ctx, args) => {
      const chunks = await ctx.db
        .query("chunks")
        .withIndex("byPdfId", (q) => q.eq("pdfId", args.pdfId))
        .filter((q) => q.eq(q.field("embeddingId"), null))
        .collect();
      return chunks;
    }
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
            text: string;
            embeddingId: Id<"embeddings"> | null;
        };
        
        const chunksWithPdfIds: ChunkWithPdfId[] = [];
        for (const pdfId of documentIds) {
            const chunks = await ctx.runQuery(internal.ingest.ingest.chunksNeedingEmbedding, { pdfId });
            // Add pdfId to each chunk object for tracking
            chunksWithPdfIds.push(...chunks.map(chunk => ({ ...chunk, pdfId })));
        }
        
        console.log("Embedding chunks:", chunksWithPdfIds);

        // Only process if we have chunks
        if (chunksWithPdfIds.length === 0) return;

        // Get embeddings for all chunk texts
        const embeddings = await embedTexts(chunksWithPdfIds.map(chunk => chunk.text));
        
        // Save embeddings with their correct chunk and PDF IDs
        await asyncMap(embeddings, async (embedding, i) => {
            const { _id: chunkId, pdfId } = chunksWithPdfIds[i];
            await ctx.runMutation(internal.ingest.ingest.addEmbedding, { 
                chunkId, 
                embedding, 
                pdfId 
            });
        });
    },
});

export const addEmbedding = internalMutation({
    args: {
        chunkId: v.id("chunks"),
        embedding: v.array(v.number()),
        pdfId: v.id("pdfs"),
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

        // Create the embedding
        const embeddingId = await ctx.db.insert("embeddings", {
            embedding: args.embedding,
            chunkId: args.chunkId,
            pdfId: args.pdfId,
        });
        await ctx.db.patch(args.chunkId, {embeddingId});
    },
});


export const chunkAndEmbed = action({
    args:{pdfId: v.id("pdfs")},
    handler: async (ctx,args) => {
        await ctx.runMutation(internal.ingest.ingest.createChunks, {
            pdfId: args.pdfId,
        });
        await ctx.scheduler.runAfter(0, internal.ingest.ingest.embedList, { documentIds: [args.pdfId] });
    }
})


export const getEmbedding = internalQuery({
    args: { pdfId: v.id("pdfs") },
    handler: async (ctx, args) => {
        const embedding = await ctx.db.query("embeddings").withIndex("byPdfId", (q) => q.eq("pdfId", args.pdfId)).first();
        return embedding;
    }
});
