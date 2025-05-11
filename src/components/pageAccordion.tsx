// src/components/pageAccordion.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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
import { motion } from "motion/react";

interface PageAccordionProps {
  pages: PdfPageInfo[];
  defaultOpen?: number | null;
  className?: string;
}

// Component that kicks the OpenAI clean-stream on mount
function PageContentWithKicks({ page }: { page: PdfPageInfo }) {
  useKickClean({ pageId: page.pageId, src: "gemini" });
  useKickClean({ pageId: page.pageId, src: "replicate" });

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h4 className="mb-2 text-right text-sm font-medium text-yellow-400/50">
          مغلق المصدر
        </h4>
        <StreamedTextBox pageId={page.pageId} src="gemini" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h4 className="mb-2 text-right text-sm font-medium text-yellow-400/50">
          مفتوح المصدر
        </h4>
        <StreamedTextBox pageId={page.pageId} src="replicate" />
      </motion.div>
    </div>
  );
}

export function PageAccordion({
  pages,
  defaultOpen = null,
  className,
}: PageAccordionProps) {
  const { page: currentPage, setPage } = usePdfPage();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const isAutoScrolling = useRef(false);

  // Keep track of which accordion rows are open
  useEffect(() => {
    if (pages?.length && defaultOpen !== null) {
      // If defaultOpen is specified, only open that item
      setOpenItems([defaultOpen.toString()]);
    } else if (currentPage) {
      // Start with only the current page open
      setOpenItems([currentPage.toString()]);
    }
  }, [pages, defaultOpen, currentPage]);

  // Only auto-scroll when the page changes programmatically (not by accordion click)
  useEffect(() => {
    if (!currentPage || isAutoScrolling.current) return;

    const id = currentPage.toString();

    // Always ensure current page is open
    if (!openItems.includes(id)) {
      setOpenItems((prev) => [...prev, id]);
    }

    // Auto-scroll to current page only once after page changes
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isAutoScrolling.current = true;
      const element = document.querySelector(`[data-page="${currentPage}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Reset auto-scrolling flag after animation
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 500);
    }, 100);

    return () => {
      clearTimeout(scrollTimeout.current);
    };
  }, [currentPage]); // Only depend on currentPage, not openItems

  // Filter pages based on search
  const filteredPages = pages?.filter(
    (page) =>
      page.pageNumber.toString().includes(searchQuery) ||
      page.cleanedSnippet?.includes(searchQuery)
  );

  if (!pages) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="py-8 text-center text-emerald-300">
        <p>لا توجد صفحات متاحة</p>
      </div>
    );
  }

  const convertToOcrStatus = (
    status: string
  ): "pending" | "processing" | "completed" | "failed" =>
    ["pending", "processing", "completed", "failed"].includes(status)
      ? (status as any)
      : "pending";

  // Simplified value change handler
  const handleValueChange = (values: string[]) => {
    setOpenItems(values);
  };

  // Handle clicking on page number
  const handlePageClick = (pageNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPage(pageNumber);
  };

  return (
    <div
      dir="rtl"
      className={cn(
        "h-full overflow-y-auto space-y-3 custom-scrollbar",
        className
      )}
    >
      {/* Search Bar */}
      <div className="bg-emerald-950/80 backdrop-blur-md rounded-lg p-3 mb-2">
        <input
          type="text"
          placeholder="بحث في الصفحات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-md placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      <Accordion
        type="multiple"
        value={openItems}
        onValueChange={handleValueChange}
        className="space-y-2"
      >
        {filteredPages.map((page) => (
          <AccordionItem
            key={page.pageId}
            value={page.pageNumber.toString()}
            data-page={page.pageNumber}
            className="backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden"
          >
            <AccordionTrigger className="flex items-center justify-between gap-3 p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                {/* Use a span with onClick instead of nested button */}
                <span
                  onClick={(e) => handlePageClick(page.pageNumber, e)}
                  className={cn(
                    "text-lg font-medium transition-colors cursor-pointer hover:text-emerald-300",
                    currentPage === page.pageNumber
                      ? "text-emerald-400"
                      : "text-white"
                  )}
                >
                  صفحة {page.pageNumber}
                </span>
                {currentPage === page.pageNumber && (
                  <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
                )}

                {/* Status Indicators - Gemini (first) and Replicate (second) */}
                <div className="flex items-center gap-1.5">
                  <OcrStepperMini
                    provider="gemini"
                    status={convertToOcrStatus(page.geminiStatus)}
                  />
                  <OcrStepperMini
                    provider="replicate"
                    status={convertToOcrStatus(page.replicateStatus)}
                  />
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4 pt-0">
              <PageContentWithKicks page={page} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
