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
    replicateStatus: v.optional(v.string()),
    replicateProcessingError: v.optional(v.string()), 
  }),

  geminiOcrResults: defineTable({
    pdfId: v.id("pdfs"),
    fileId: v.string(), // StorageId
    extractedText: v.string(),
    confidenceScore: v.optional(v.number()),
    processedAt: v.number(),
    geminiModel: v.string(),
  })
  .index("by_pdf_id", ["pdfId"]),

  replicateOcrResults: defineTable({
    pdfId: v.id("pdfs"),
    fileId: v.string(), // StorageId
    extractedText: v.string(),
    processedAt: v.number(),
    replicateModelId: v.string(),
    replicateModelVersion: v.string(),
  })
  .index("by_pdf_id", ["pdfId"]),
});