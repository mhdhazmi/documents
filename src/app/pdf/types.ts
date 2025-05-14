import { Id } from "../../../convex/_generated/dataModel";

// OCR status values used across the application
export type OcrStatus = "pending" | "processing" | "completed" | "failed";

// Type for page information used in the pages accordion
export type PdfPageInfo = {
  pageId: Id<"pages">;
  pageNumber: number;
  geminiStatus: OcrStatus;
  replicateStatus: OcrStatus;
  cleanedSnippet: string | null;
  fullText?: string | null;      // Complete cleaned text when available
};