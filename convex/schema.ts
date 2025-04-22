// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Stores metadata about uploaded PDF files and tracks processing status for each provider.
  pdfs: defineTable({
    fileId: v.string(), 
    filename: v.string(), 
    fileSize: v.number(), 
    pageCount: v.number(),
    uploadedAt: v.number(), 
    status: v.string(),
    processingError: v.optional(v.string()), 

  }),

  geminiOcrResults: defineTable({
    pdfId: v.id("pdfs"),
    extractedText: v.optional(v.string()),
    processedAt: v.number(),
    ocrStatus: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
  })
  .index("by_pdf_id", ["pdfId"]),

  replicateOcrResults: defineTable({
    pdfId: v.id("pdfs"),
    extractedText: v.optional(v.string()),
    processedAt: v.number(),
    ocrStatus: v.union(v.literal("processing"), v.literal("completed"), v.literal("failed")),
  })
  .index("by_pdf_id", ["pdfId"]),

  openaiOcrResults: defineTable({
    pdfId: v.id("pdfs"),
    fileId: v.string(), // StorageId
    originalSource: v.string(), // "gemini" or "replicate"
    cleanedText: v.string(),
    processedAt: v.number(),
    openaiModel: v.string(),
  })
  .index("by_pdf_id", ["pdfId"])
  .index("by_pdf_and_source", ["pdfId", "originalSource"]),

  chunks: defineTable({
    documentId: v.id("pdfs"),
    text: v.string(),
    embeddingId: v.union(v.id("embeddings"), v.null()),
  })
    .index("byDocumentId", ["documentId"])
    .index("byEmbeddingId", ["embeddingId"]),


embeddings: defineTable({
  embedding: v.array(v.number()),
  chunkId: v.id("chunks"),
})
  .index("byChunkId", ["chunkId"])
  .vectorIndex("byEmbedding", {
    vectorField: "embedding",
    dimensions: 1536,
  })
});