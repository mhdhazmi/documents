import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";

interface PdfSummarySectionProps {
  pdfId: Id<"pdfs">;
}

export default function PdfSummarySection({ pdfId }: PdfSummarySectionProps) {
  // Query the PDF summary
  const summary = useQuery(api.pdf.queries.getPdfSummary, { pdfId });

  if (!summary) {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 mb-4 shadow-lg border border-white/10">
        <h2 className="text-xl font-semibold mb-4 text-white">Document Summary</h2>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full bg-white/10" />
          <Skeleton className="h-4 w-[90%] bg-white/10" />
          <Skeleton className="h-4 w-[95%] bg-white/10" />
          <Skeleton className="h-4 w-[85%] bg-white/10" />
        </div>
      </div>
    );
  }

  if (summary.status === "failed") {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Summary Generation Failed</AlertTitle>
        <AlertDescription>
          We were unable to generate a summary for this document. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (summary.status === "processing") {
    return (
      <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 mb-4 shadow-lg border border-white/10">
        <h2 className="text-xl font-semibold mb-4 text-white">Document Summary</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded-md w-full"></div>
          <div className="h-4 bg-white/10 rounded-md w-[90%]"></div>
          <div className="h-4 bg-white/10 rounded-md w-[95%]"></div>
          <div className="h-4 bg-white/10 rounded-md w-[85%]"></div>
        </div>
        <div className="mt-4 text-sm text-emerald-300">Generating summary...</div>
      </div>
    );
  }

  // Split summary into Arabic and English parts
  // Assuming the format follows the prompt with Arabic first, then English
  const parts = summary.summary.split(/(?=English Summary:)/i);
  const arabicSummary = parts[0];
  const englishSummary = parts.length > 1 ? parts[1] : "";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/5 backdrop-blur-md rounded-xl p-6 mb-4 shadow-lg border border-white/10"
    >
      <h2 className="text-xl font-semibold mb-4 text-white">Document Summary</h2>
      
      {/* Arabic summary */}
      <div className="mb-4" dir="rtl">
        <h3 className="text-lg font-medium mb-2 text-emerald-300">ملخص المستند</h3>
        <div className="text-white/90 whitespace-pre-wrap">{arabicSummary}</div>
      </div>
      
      {/* English summary if available */}
      {englishSummary && (
        <div>
          <h3 className="text-lg font-medium mb-2 text-emerald-300">English Summary</h3>
          <div className="text-white/90 whitespace-pre-wrap">{englishSummary}</div>
        </div>
      )}
    </motion.div>
  );
}