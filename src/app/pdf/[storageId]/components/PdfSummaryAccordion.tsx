import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { FileText } from "lucide-react";

interface PdfSummaryAccordionProps {
  pdfId: Id<"pdfs">;
  className?: string;
}

export default function PdfSummaryAccordion({ pdfId, className }: PdfSummaryAccordionProps) {
  // Query the PDF summary
  const summary = useQuery(api.pdf.queries.getPdfSummary, { pdfId });
  const [isOpen, setIsOpen] = useState(true);

  const handleValueChange = (values: string[]) => {
    setIsOpen(values.includes("summary"));
  };

  const renderSummaryContent = () => {
    if (!summary) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full bg-white/10" />
          <Skeleton className="h-4 w-[90%] bg-white/10" />
          <Skeleton className="h-4 w-[95%] bg-white/10" />
          <Skeleton className="h-4 w-[85%] bg-white/10" />
        </div>
      );
    }

    if (summary.status === "failed") {
      return (
        <Alert variant="destructive">
          <AlertTitle>Summary Generation Failed</AlertTitle>
          <AlertDescription>
            We were unable to generate a summary for this document. Please try again later.
          </AlertDescription>
        </Alert>
      );
    }

    if (summary.status === "processing") {
      return (
        <div>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-white/10 rounded-md w-full"></div>
            <div className="h-4 bg-white/10 rounded-md w-[90%]"></div>
            <div className="h-4 bg-white/10 rounded-md w-[95%]"></div>
            <div className="h-4 bg-white/10 rounded-md w-[85%]"></div>
          </div>
          <div className="mt-4 text-sm text-emerald-300 text-right">جاري إنشاء الملخص...</div>
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Arabic summary */}
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2 text-emerald-300">ملخص المستند</h3>
          <div className="text-white/90 whitespace-pre-wrap">{arabicSummary}</div>
        </div>
        
        {/* English summary if available */}
        {englishSummary && (
          <div className="mt-6" dir="ltr">
            <h3 className="text-lg font-medium mb-2 text-emerald-300">English Summary</h3>
            <div className="text-white/90 whitespace-pre-wrap">{englishSummary}</div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <Accordion
      type="multiple"
      value={isOpen ? ["summary"] : []}
      onValueChange={handleValueChange}
      className={`mb-4 ${className}`}
    >
      <AccordionItem
        value="summary"
        className="backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden bg-white/5"
        dir="rtl"
      >
        <AccordionTrigger className="flex items-center justify-between gap-3 p-4 hover:bg-white/10 transition-colors no-underline [&:hover]:no-underline [&_*]:no-underline">
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium text-white">
              ملخص المستند
            </span>
            {summary?.status === "processing" && (
              <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
            )}
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-4 pb-4 pt-2">
          <div dir="rtl">
            {renderSummaryContent()}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}