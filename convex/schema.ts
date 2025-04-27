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
    cleanedText: v.string(),
    processedAt: v.number(),
    cleaningStatus:  v.union(v.literal("started"), v.literal("completed")),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  })
  .index("by_pdf_id", ["pdfId"]),

  chunks: defineTable({
    pdfId: v.id("pdfs"),
    text: v.string(),
    embeddingId: v.union(v.id("embeddings"), v.null()),
  })
    .index("byPdfId", ["pdfId"])
    .index("byEmbeddingId", ["embeddingId"]),


embeddings: defineTable({
  embedding: v.array(v.number()),
  chunkId: v.id("chunks"),
  pdfId: v.id("pdfs"),
})
  .index("byChunkId", ["chunkId"])
  .index("byPdfId", ["pdfId"])

  .vectorIndex("byEmbedding", {
    vectorField: "embedding",
    dimensions: 1536,
  })
});