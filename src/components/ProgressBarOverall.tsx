// src/components/ProgressBarOverall.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { usePageStream } from "@/store/pageStreams";
import { motion } from "motion/react";

interface ProgressBarOverallProps {
  pdfId?: Id<"pdfs">;
  percentage?: number;
}

export default function ProgressBarOverall({ pdfId, percentage }: ProgressBarOverallProps) {
  // Always fetch these hooks at the top level, unconditionally
  const pages = useQuery(api.pdf.queries.getPagesByPdf, 
    pdfId ? { pdfId } : "skip" // Use "skip" instead of conditional hook call
  );
  const { chunks } = usePageStream();
  
  // Get status text based on progress
  const getStatusText = (percent: number) => {
    if (percent === 0) return 'جاري البدء...';
    if (percent < 25) return 'جاري معالجة الصفحات الأولى...';
    if (percent < 50) return 'جاري المعالجة...';
    if (percent < 75) return 'اكتملت معظم المعالجة...';
    if (percent < 100) return 'اكتمال المعالجة قريبًا...';
    return 'اكتملت المعالجة!';
  };

  // Calculate progress based on either direct percentage or pages data
  let progressValue = 0;
  
  if (percentage !== undefined) {
    // Use direct percentage if provided
    progressValue = Math.max(0, Math.min(100, percentage));
  } else if (pdfId && pages) {
    // Otherwise calculate from pages
    const totalPages = pages.length;
    const completedPages = pages.filter((page) => {
      const geminiKey = `${page.pageId}_gemini` as keyof typeof chunks;
      const replicateKey = `${page.pageId}_replicate` as keyof typeof chunks;
      return chunks[geminiKey]?.length > 0 || chunks[replicateKey]?.length > 0;
    }).length;
    
    progressValue = totalPages > 0 ? (completedPages / totalPages) * 100 : 0;
  }
  
  // Hide when complete
  if (progressValue >= 100) return null;
  
  // Common progress bar UI
  if (percentage !== undefined) {
    // Modern style for direct percentage mode
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-lg shadow-lg p-4 transition-all duration-500 ease-in-out"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-white">{getStatusText(progressValue)}</div>
          <div className="text-sm font-medium text-white">{Math.round(progressValue)}%</div>
        </div>
        
        <div className="w-full bg-gray-200/20 rounded-full h-2.5 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressValue}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-2.5 rounded-full"
            style={{ 
              background: `linear-gradient(90deg, rgba(59, 130, 246, 0.8) 0%, rgba(147, 51, 234, 0.8) 100%)`,
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
            }}
          />
        </div>
        
        {/* Processing Indicator */}
        <div className="mt-2 flex items-center justify-start">
          <div className="flex-shrink-0 h-2 w-2 bg-blue-500 rounded-full animate-pulse mr-2" />
          <span className="text-xs text-white/80">جاري معالجة المستند...</span>
        </div>
      </motion.div>
    );
  }
  
  // Original style for pdfId mode
  if (!pdfId || !pages) return null;
  
  const totalPages = pages.length;
  const completedPages = pages.filter((page) => {
    const geminiKey = `${page.pageId}_gemini` as keyof typeof chunks;
    const replicateKey = `${page.pageId}_replicate` as keyof typeof chunks;
    return chunks[geminiKey]?.length > 0 || chunks[replicateKey]?.length > 0;
  }).length;

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
            animate={{ width: `${progressValue}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full bg-emerald-400 rounded-full"
          />
        </div>
      </div>
      <div className="text-sm font-medium text-emerald-300">
        {Math.round(progressValue)}%
      </div>
    </motion.div>
  );
}