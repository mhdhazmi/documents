// src/app/pdf/[storageId]/pages/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import PDFViewer, { PDFViewerHandle } from "@/app/components/PDFViewer";
import { PageAccordion } from "@/components/pageAccordion";
import ProgressBarOverall from "@/components/ProgressBarOverall";
import { usePdfPage } from "@/app/pdf/pages/context";
import { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function PagesView() {
  const params = useParams();
  const storageId = params.storageId as Id<"pdfs">;
  const { page, setPage } = usePdfPage();
  const viewerRef = useRef<PDFViewerHandle>(null);
  const [isAccordionCollapsed, setIsAccordionCollapsed] = useState(false);

  // Get PDF data
  const pdf = useQuery(api.pdf.queries.getPdf, { pdfId: storageId });
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl,
    pdf?.fileId ? { fileId: pdf.fileId } : "skip"
  );

  // Get pages data for accordion
  const pages = useQuery(api.pdf.queries.getPagesByPdf, { pdfId: storageId });

  // Handle page changes from PDFViewer
  const handlePageChange = (pageNumber: number) => {
    setPage(pageNumber);
  };

  // Sync context page changes to PDFViewer
  useEffect(() => {
    if (page && viewerRef.current) {
      viewerRef.current.goToPage(page);
    }
  }, [page]);

  // Calculate proportions
  const accordionWidth = isAccordionCollapsed
    ? "w-16"
    : "w-full md:w-[65%] lg:w-[70%]";
  const pdfWidth = isAccordionCollapsed
    ? "w-full"
    : "w-full md:w-[35%] lg:w-[30%]";

  // Show skeleton loading state
  if (!pdf || !pages) {
    return (
      <div
        className="h-screen flex flex-col relative overflow-hidden"
        style={{
          backgroundImage: 'url("/background.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Skeleton Progress Bar */}
        <div className="sticky top-0 z-50 bg-emerald-950/80 backdrop-blur-md border-b border-emerald-800/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-40 bg-white/10" />
              <Skeleton className="h-4 w-24 bg-white/10" />
            </div>
            <Skeleton className="h-8 w-32 bg-white/10" />
          </div>
        </div>

        {/* Skeleton Main Content */}
        <div className="flex-1 flex gap-1 md:gap-2 p-2 md:p-4 overflow-hidden">
          {/* Skeleton Accordion Section */}
          <div className="w-full md:w-[65%] lg:w-[70%] relative">
            <div className="h-full bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-4 space-y-4">
              {/* Search bar skeleton */}
              <Skeleton className="h-10 w-full bg-white/10" />

              {/* Accordion items skeleton */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 rounded-lg border border-white/10 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-32 bg-white/10" />
                      <Skeleton className="h-4 w-4 bg-white/10 rounded-full" />
                      <Skeleton className="h-4 w-4 bg-white/10 rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20 bg-white/10" />
                    <Skeleton className="h-24 w-full bg-white/10" />
                    <Skeleton className="h-4 w-20 bg-white/10" />
                    <Skeleton className="h-24 w-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skeleton Divider */}
          <div className="hidden md:block w-px bg-gradient-to-t from-transparent via-emerald-500/50 to-transparent" />

          {/* Skeleton PDF Viewer Section */}
          <div className="w-full md:w-[35%] lg:w-[30%] relative">
            <div className="h-full bg-white/5 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Skeleton className="h-96 w-full bg-white/10" />
                <Skeleton className="h-4 w-24 mx-auto bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Enhanced Progress Bar */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-emerald-950/80 backdrop-blur-md border-b border-emerald-800/30"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">{pdf.filename}</h1>
            <span className="text-sm text-emerald-300">
              صفحة {page} من {pdf.pageCount}
            </span>
          </div>
          <ProgressBarOverall pdfId={storageId} />
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-1 md:gap-2 p-2 md:p-4 overflow-hidden">
        {/* Accordion Section */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`transition-all duration-300 ${accordionWidth} relative`}
        >
          <div className="h-full bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
            {!isAccordionCollapsed && (
              <div className="h-full overflow-y-auto p-2 md:p-4 custom-scrollbar">
                <PageAccordion pages={pages} />
              </div>
            )}
            {/* Collapse/Expand Button */}
            <button
              onClick={() => setIsAccordionCollapsed(!isAccordionCollapsed)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 bg-emerald-600/90 hover:bg-emerald-600 text-white p-2 rounded-full backdrop-blur-sm transition-colors z-10 shadow-lg"
            >
              {isAccordionCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Divider with gradient */}
        <div className="hidden md:block w-px bg-gradient-to-t from-transparent via-emerald-500/50 to-transparent" />

        {/* PDF Viewer Section */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`transition-all duration-300 ${pdfWidth} relative`}
        >
          <div className="h-full bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden relative">
            <PDFViewer
              ref={viewerRef}
              pdfUrl={fileUrl || null}
              initialPage={1}
              onPageChange={handlePageChange}
              fitToWidth={true} // Always fit to width
              maxScale={2.5}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
