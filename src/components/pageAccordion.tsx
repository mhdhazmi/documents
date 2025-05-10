// app/components/PageAccordion/PageAccordion.tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import OcrStepperMini from "@/components/OcrStepperMini";
import type { PdfPageInfo } from "@/app/pdf/types";
interface PageAccordionProps {
  /** Array produced by usePagesQuery(pdfId) */
  pages: PdfPageInfo[];
  /** Which pageNumber should start open (optional) */
  defaultOpen?: number | null;
  /** Allow parent to pass extra classes if it owns the layout */
  className?: string;
}

// Using shadcn/ui Skeleton component for loading state
const AccordionSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);

// Empty state component
const EmptyState = ({ title }: { title: string }) => (
  <div className="text-center py-8 text-muted-foreground">
    <p>{title}</p>
  </div>
);

// Helper function to convert our OcrStatus to the type expected by OcrStepperMini
const convertToOcrStatus = (
  status: string
): "pending" | "processing" | "completed" | "failed" => {
  if (["pending", "processing", "completed", "failed"].includes(status)) {
    return status as "pending" | "processing" | "completed" | "failed";
  }
  return "pending"; // fallback
};

export function PageAccordion({
  pages,
  defaultOpen = null,
  className,
}: PageAccordionProps) {
  const [value, setValue] = useState(defaultOpen ? defaultOpen.toString() : "");

  // Loading state
  if (!pages) {
    return <AccordionSkeleton count={4} />;
  }

  // Empty state
  if (!pages.length) {
    return <EmptyState title="لا توجد صفحات" />;
  }

  return (
    <div dir="rtl" className={cn("w-full max-w-3xl mx-auto p-4", className)}>
      <Accordion
        type="single"
        collapsible
        value={value}
        onValueChange={setValue}
      >
        {pages.map((page) => (
          <AccordionItem key={page.pageId} value={page.pageNumber.toString()}>
            <AccordionTrigger className="flex items-center justify-between gap-2">
              <span className="font-medium text-right">
                صفحة {page.pageNumber}
              </span>
              <div className="flex flex-col gap-1">
                {/* Gemini provider + status pill */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-blue-600">Gemini</span>
                  <OcrStepperMini
                    provider="gemini"
                    status={convertToOcrStatus(page.geminiStatus)}
                  />
                </div>
                {/* Replicate provider + status pill */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-purple-600">Replicate</span>
                  <OcrStepperMini
                    provider="replicate"
                    status={convertToOcrStatus(page.replicateStatus)}
                  />
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="space-y-6"></AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
