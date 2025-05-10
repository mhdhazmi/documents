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
  pages: PdfPageInfo[];
  defaultOpen?: number | null;
  className?: string;
}

// ────────────────────────────────────────────────────────────
//  Skeleton + Empty-state helpers
// ────────────────────────────────────────────────────────────
const AccordionSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);

const EmptyState = ({ title }: { title: string }) => (
  <div className="py-8 text-center text-muted-foreground">
    <p>{title}</p>
  </div>
);

// ────────────────────────────────────────────────────────────
//  Utils
// ────────────────────────────────────────────────────────────
const convertToOcrStatus = (
  status: string
): "pending" | "processing" | "completed" | "failed" =>
  ["pending", "processing", "completed", "failed"].includes(status)
    ? (status as any)
    : "pending";

// Component that kicks the OpenAI clean-stream on mount
function PageContentWithKicks({ page }: { page: PdfPageInfo }) {
  useKickClean({ pageId: page.pageId, src: "gemini" });
  useKickClean({ pageId: page.pageId, src: "replicate" });

  return (
    <>
      {/* Gemini OCR */}
      <div>
        <h4 className="mb-2 text-right text-sm font-medium text-blue-600">
          نموذج جيميني
        </h4>
        <StreamedTextBox pageId={page.pageId} src="gemini" />
      </div>

      {/* Replicate OCR */}
      <div>
        <h4 className="mb-2 text-right text-sm font-medium text-purple-600">
          نموذج ريبليكيت
        </h4>
        <StreamedTextBox pageId={page.pageId} src="replicate" />
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ────────────────────────────────────────────────────────────
export function PageAccordion({
  pages,
  defaultOpen = null,
  className,
}: PageAccordionProps) {
  const { page: currentPage, setPage } = usePdfPage();

  // Keep track of which accordion rows are open
  const [openItems, setOpenItems] = useState<string[]>(() => {
    if (defaultOpen) return [defaultOpen.toString()];
    return pages?.map((p) => p.pageNumber.toString()) ?? [];
  });

  // Once `pages` arrive, open everything (only once)
  useEffect(() => {
    if (!defaultOpen && pages?.length && openItems.length === 0) {
      setOpenItems(pages.map((p) => p.pageNumber.toString()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ─── Loading & Empty states ───────────────────────────────
  if (!pages) return <AccordionSkeleton count={4} />;
  if (pages.length === 0) return <EmptyState title="لا توجد صفحات" />;

  // ─── UI ───────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      className={cn(
        "col-start-2 row-start-1 h-full overflow-y-auto p-4",
        "prose max-w-none text-xl leading-8", // large, readable text
        className
      )}
    >
      <Accordion
        type="multiple"
        collapsible
        value={openItems}
        onValueChange={(v) => setOpenItems(Array.isArray(v) ? v : v ? [v] : [])}
      >
        {pages.map((page) => (
          <AccordionItem
            key={page.pageId}
            value={page.pageNumber.toString()}
            data-page={page.pageNumber}
          >
            <AccordionTrigger
              className="flex items-center justify-between gap-2"
              onClick={() => setPage(page.pageNumber)}
            >
              <span className="font-medium text-right">
                صفحة {page.pageNumber}
              </span>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-blue-600">Gemini</span>
                  <OcrStepperMini
                    provider="gemini"
                    status={convertToOcrStatus(page.geminiStatus)}
                  />
                </div>
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
