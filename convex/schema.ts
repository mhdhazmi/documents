// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { embedding as embeddingConfig } from "./config";

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

  // Legacy tables removed (geminiOcrResults, replicateOcrResults, openaiOcrResults)

  chunks: defineTable({
    pdfId: v.id("pdfs"),
    pageId: v.union(v.id("pages"), v.null()), // Add pageId field
    text: v.string(),
    embeddingId: v.union(v.id("embeddings"), v.null()),
  })
    .index("byPdfId", ["pdfId"])
    .index("byPageId", ["pageId"]) // ✅ Consistent camelCase naming
    .index("byEmbeddingId", ["embeddingId"]),

  embeddings: defineTable({
    embedding: v.array(v.number()),
    chunkId: v.id("chunks"),
    pdfId: v.id("pdfs"),
    pageId: v.union(v.id("pages"), v.null()), // NEW: Add pageId field
  })
    .index("byChunkId", ["chunkId"])
    .index("byPdfId", ["pdfId"])
    .index("byPageId", ["pageId"]) // NEW: Add index for page-level queries
    .vectorIndex("byEmbedding", {
      vectorField: "embedding",
      dimensions: embeddingConfig.dimensions,
      filterFields: ["pdfId", "pageId"], // NEW: Add pageId to vector search filter fields
    }),

  // Add to schema.ts
  chatSessions: defineTable({
    sessionId: v.string(),
  }),

  messages: defineTable({
    sessionId: v.optional(v.string()),
    isUser: v.boolean(),
    text: v.string(),
    timestamp: v.number(),
  }).index("bySessionId", ["sessionId"]),

  ragSources: defineTable({
    sessionId: v.string(),
    pdfIds: v.array(v.id("pdfs")),
  })
    .index("bySessionId", ["sessionId"])
    .index("byPdfId", ["pdfIds"]),

  // New page by page schemas

  pages: defineTable({
    pdfId: v.id("pdfs"),
    pageNumber: v.number(),
    fileId: v.string(), // Convex storage ID for the page image/PDF
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    isPriority: v.optional(v.boolean()), // New field for priority processing
  })
    .index("byPdfId", ["pdfId"])
    .index("byPdfIdAndPageNumber", ["pdfId", "pageNumber"])
    .index("byPriority", ["isPriority"]), // New index for querying priority pages

  geminiPageOcr: defineTable({
    pageId: v.id("pages"),
    extractedText: v.optional(v.string()),
    ocrStatus: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    processedAt: v.number(),
  }).index("by_page_id", ["pageId"]),

  replicatePageOcr: defineTable({
    pageId: v.id("pages"),
    extractedText: v.optional(v.string()),
    ocrStatus: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    processedAt: v.number(),
  }).index("by_page_id", ["pageId"]),

  openaiCleanedPage: defineTable({
    pageId: v.id("pages"),
    cleanedText: v.string(),        // Will continue to hold text, but only for compatibility
    fullText: v.optional(v.string()), // Added field to store the complete text content
    processedAt: v.number(),
    cleaningStatus: v.union(v.literal("started"), v.literal("completed")),
    source: v.union(v.literal("gemini"), v.literal("replicate")),
  })
    .index("by_page_id", ["pageId"])
    .index("by_page_source", ["pageId", "source"]), // Add this index
    
  pdfSummaries: defineTable({
    pdfId: v.id("pdfs"),
    summary: v.string(),
    processedAt: v.number(),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  }).index("by_pdf_id", ["pdfId"]),
});