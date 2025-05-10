// src/components/ProgressBarOverall.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { usePageStream } from "@/store/pageStreams";

interface ProgressBarOverallProps {
  pdfId: Id<"pdfs">;
}

export default function ProgressBarOverall({ pdfId }: ProgressBarOverallProps) {
  const pages = useQuery(api.pdf.queries.getPagesByPdf, { pdfId });
  const { chunks } = usePageStream();

  if (!pages) return null;

  // Count pages with any cleaned content in the store
  const totalPages = pages.length;
  const completedPages = pages.filter((page) => {
    const geminiKey = `${page.pageId}_gemini`;
    const replicateKey = `${page.pageId}_replicate`;
    return chunks[geminiKey]?.length > 0 || chunks[replicateKey]?.length > 0;
  }).length;

  const progress = totalPages > 0 ? (completedPages / totalPages) * 100 : 0;

  return (
    <div className="fixed top-4 right-4 w-64 bg-emerald-950/80 backdrop-blur-md rounded-lg border border-emerald-800/30 p-3 z-50">
      <div className="flex justify-between text-xs text-white/80 mb-1">
        <span>معالجة الصفحات</span>
        <span>
          {completedPages} / {totalPages}
        </span>
      </div>
      <div className="w-full bg-emerald-900/30 rounded-full h-2">
        <div
          className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
