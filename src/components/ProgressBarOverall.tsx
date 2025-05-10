// src/components/ProgressBarOverall.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { usePageStream } from "@/store/pageStreams";
import { motion } from "motion/react";

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
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-3"
    >
      <div className="flex flex-col items-end gap-1">
        <div className="text-xs text-emerald-300">
          {completedPages} / {totalPages} صفحة
        </div>
        <div className="w-32 h-2 bg-emerald-900/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-emerald-400 rounded-full"
          />
        </div>
      </div>
      <div className="text-sm font-medium text-emerald-300">
        {Math.round(progress)}%
      </div>
    </motion.div>
  );
}
