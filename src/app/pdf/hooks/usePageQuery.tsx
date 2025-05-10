import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { PdfPageInfo } from "../types";
import type { Id } from "../../../../convex/_generated/dataModel";

export function usePagesQuery(pdfId: Id<"pdfs"> | undefined) {
  return useQuery(
    api.pdf.queries.getPagesByPdf,
    pdfId ? { pdfId } : "skip"
  ) as PdfPageInfo[] | undefined;
}