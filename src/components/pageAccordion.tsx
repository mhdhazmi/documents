// app/components/PageAccordion/PageAccordion.tsx
"use client";

import { useState, useEffect } from "react";
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
import StreamedTextBox from "@/app/pdf/StreamedTextBox";
import { usePdfPage } from "@/app/pdf/pages/context";
import { useKickClean } from "@/app/pdf/[storageId]/hooks/useKickClean";

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

// Component to handle hooks for each page
function PageContentWithKicks({ page }: { page: PdfPageInfo }) {
  // Call useKickClean for both sources
  useKickClean({ pageId: page.pageId, src: "gemini" });
  useKickClean({ pageId: page.pageId, src: "replicate" });

  return (
    <>
      {/* Gemini OCR Section */}
      <div>
        <h4 className="text-sm font-medium text-blue-600 mb-2 text-right">
          نموذج جيميني
        </h4>
        <StreamedTextBox pageId={page.pageId} src="gemini" />
      </div>

      {/* Replicate OCR Section */}
      <div>
        <h4 className="text-sm font-medium text-purple-600 mb-2 text-right">
          نموذج ريبليكيت
        </h4>
        <StreamedTextBox pageId={page.pageId} src="replicate" />
      </div>
    </>
  );
}

export function PageAccordion({
  pages,
  defaultOpen = null,
  className,
}: PageAccordionProps) {
  const [value, setValue] = useState(defaultOpen ? defaultOpen.toString() : "");
  const { page: currentPage, setPage } = usePdfPage(); // Get context

  // FE-15: Auto-expand accordion when page changes from PDFViewer
  useEffect(() => {
    if (currentPage && currentPage.toString() !== value) {
      setValue(currentPage.toString());

      // Scroll to the active row with delay to ensure DOM is updated
      setTimeout(() => {
        const element = document.querySelector(`[data-page="${currentPage}"]`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [currentPage, value]);

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
          <AccordionItem
            key={page.pageId}
            value={page.pageNumber.toString()}
            data-page={page.pageNumber} // For scrolling reference
          >
            <AccordionTrigger
              className="flex items-center justify-between gap-2"
              onClick={() => setPage(page.pageNumber)} // FE-14: Jump to page when clicked
            >
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
            <AccordionContent className="space-y-6">
              <PageContentWithKicks page={page} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
