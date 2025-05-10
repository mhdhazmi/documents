// src/components/pageAccordion.tsx
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
        <h4 className="mb-2 text-right text-sm font-medium text-blue-400">
          نموذج جيميني (مغلق المصدر)
        </h4>
        <StreamedTextBox pageId={page.pageId} src="gemini" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h4 className="mb-2 text-right text-sm font-medium text-purple-400">
          نموذج ريبليكيت (مفتوح المصدر)
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

  // Keep track of which accordion rows are open
  useEffect(() => {
    if (pages?.length) {
      // Start with all items open for better UX
      setOpenItems(pages.map((p) => p.pageNumber.toString()));
    }
  }, [pages]);

  // Auto-expand the row that matches the PDF-viewer page
  useEffect(() => {
    if (!currentPage) return;
    const id = currentPage.toString();

    if (!openItems.includes(id)) {
      setOpenItems((prev) => [...prev, id]);
    }

    // Smooth-scroll to the row
    setTimeout(() => {
      document
        .querySelector(`[data-page="${currentPage}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [currentPage, openItems]);

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

  return (
    <div
      dir="rtl"
      className={cn("h-full overflow-y-auto space-y-3", className)}
    >
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-emerald-950/80 backdrop-blur-md rounded-lg p-3 mb-2">
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
        onValueChange={(v) => setOpenItems(Array.isArray(v) ? v : v ? [v] : [])}
        className="space-y-2"
      >
        {filteredPages.map((page) => (
          <AccordionItem
            key={page.pageId}
            value={page.pageNumber.toString()}
            data-page={page.pageNumber}
            className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden"
          >
            <AccordionTrigger
              className="flex items-center justify-between gap-3 p-4 hover:bg-white/10 transition-colors"
              onClick={() => setPage(page.pageNumber)}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-lg font-medium transition-colors",
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
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-400">جيميني</span>
                  <OcrStepperMini
                    provider="gemini"
                    status={convertToOcrStatus(page.geminiStatus)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-purple-400">ريبليكيت</span>
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
