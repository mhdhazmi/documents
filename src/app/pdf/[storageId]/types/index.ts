import { Id } from '../../../../../convex/_generated/dataModel'

export interface GeminiOCRResult {
  ocrResults?: {
    processedAt?: number;
    confidenceScore?: number;
    extractedText?: string;
  }
}

export interface ReplicateOCRResult {
  ocrResults?: {
    processedAt?: number;
    replicateModelId?: string;
    extractedText?: string;
  }
}

export interface OpenAICleanedResult {
  processedAt?: number;
  openaiModel?: string;
  cleanedText?: string;
  originalSource?: string;
}

export interface OpenAIResults {
  ocrResults?: OpenAICleanedResult[];
}

export type PDFId = Id<"pdfs"> 