import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "../_generated/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAI } from "openai";
import { asyncMap } from "modern-async";
import { internal } from "../_generated/api";

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
                documentId: arg.pdfId,
                text: chunk,
                embeddingId: null,
            });

         });
    }
});

export async function embedTexts(texts: string[]) {
    if (texts.length === 0) return [];
    const openai = new OpenAI();
    const { data } = await openai.embeddings.create({
      input: texts,
      model: "text-embedding-ada-002",
    });
    return data.map(({ embedding }) => embedding);
  }

  export const chunksNeedingEmbedding = internalQuery({
    args:{documentId: v.id("pdfs")},
    handler: async (ctx, args) => {
      const chunks = await ctx.db
        .query("chunks")
        .withIndex("byDocumentId", (q) => q.eq("documentId", args.documentId))
        .collect();
      return chunks.filter((chunk) => chunk.embeddingId === null);
    }
  });

export const embedList = internalAction({
    args: {
        documentIds: v.array(v.id("pdfs")),
    },
    handler: async (ctx, { documentIds }) => {
        const chunks = (
            await asyncMap(documentIds, (documentId) =>
                 ctx.runQuery(internal.ingest.ingest.chunksNeedingEmbedding, { documentId })
            )
        ).flat();

        const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
        await asyncMap(embeddings, async (embedding, i) => {
            const { _id: chunkId } = chunks[i];
            await ctx.runMutation(internal.ingest.ingest.addEmbedding, { chunkId, embedding });
        });
    },
});

export const addEmbedding = internalMutation({
    args: {
        chunkId: v.id("chunks"),
        embedding: v.array(v.number()),
    },
    handler: async (ctx, args) => {
        const embeddingId = await ctx.db.insert("embeddings", {
            embedding: args.embedding,
            chunkId: args.chunkId,
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
