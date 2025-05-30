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
import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import PdfSummaryAccordion from "../components/PdfSummaryAccordion";
import ChatWithDocumentPopup from "@/components/ChatWithDocumentPopup";

export default function PagesView() {
  const params = useParams();
  const storageId = params.storageId as Id<"pdfs">;
  const { page, setPage } = usePdfPage();
  const viewerRef = useRef<PDFViewerHandle>(null);
  const [isAccordionCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get PDF data
  const pdf = useQuery(api.pdf.queries.getPdf, { pdfId: storageId });
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl,
    pdf?.fileId ? { fileId: pdf.fileId as Id<"_storage"> } : "skip"
  );

  // Get pages data for accordion
  const pages = useQuery(api.pdf.queries.getPagesByPdf, { pdfId: storageId });

  // Handle page changes from PDFViewer
  const handlePageChange = useCallback(
    (pageNumber: number) => {
      setPage(pageNumber);
    },
    [setPage]
  );

  // Sync context page changes to PDFViewer, but avoid initial auto-scrolling
  const initialRender = useRef(true);
  
  useEffect(() => {
    if (initialRender.current) {
      // Skip first render to prevent auto-scrolling on page load
      initialRender.current = false;
      return;
    }
    
    if (page && viewerRef.current) {
      viewerRef.current.goToPage(page);
    }
  }, [page]);

  // Remove unused width calculations for mobile-friendly layout
  // We now use direct tailwind classes in the markup

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
        <div className="bg-emerald-950/80 backdrop-blur-md border-b border-emerald-800/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-40 bg-white/10" />
              <Skeleton className="h-4 w-24 bg-white/10" />
            </div>
            <Skeleton className="h-8 w-32 bg-white/10" />
          </div>
        </div>

        {/* Skeleton Main Content - Stacked on mobile, row on desktop */}
        <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 md:p-4 overflow-hidden">
          {/* Skeleton Accordion Section - Top on mobile */}
          <div className="w-full md:w-[65%] lg:w-[70%] h-2/5 md:h-full relative">
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

          {/* Skeleton Dividers */}
          <div className="block md:hidden h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent my-1"></div>
          <div className="hidden md:block w-px bg-gradient-to-t from-transparent via-emerald-500/50 to-transparent" />

          {/* Skeleton PDF Viewer Section - Bottom on mobile */}
          <div className="w-full md:w-[35%] lg:w-[30%] h-3/5 md:h-full relative">
            <div className="h-full bg-white/5 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Skeleton className="h-full w-full max-h-96 bg-white/10" />
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
        className="bg-emerald-950/80 backdrop-blur-md border-b border-emerald-800/30"
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

      {/* Main Content Area - Flex column on mobile, row on desktop */}
      <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 md:p-4 overflow-hidden">
        {/* Accordion Section - Full width on top for mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`transition-all duration-300 w-full md:w-[65%] lg:w-[70%] h-2/5 md:h-full relative`}
        >
          <div className="h-full bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
            {!isAccordionCollapsed && (
              <div className="h-full overflow-y-auto p-2 md:p-4 custom-scrollbar">
                {/* Search Bar with RTL support */}
                <div className="bg-emerald-950/80 backdrop-blur-md rounded-lg p-3 mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="بحث في المستند..."
                      dir="rtl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm text-white bg-white/10 border border-white/20 rounded-md placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* PDF Summary Accordion */}
                <PdfSummaryAccordion pdfId={storageId} />
                
                {/* Page Accordion */}
                <PageAccordion 
                  pages={pages} 
                  showSearch={false}
                  searchQuery={searchQuery}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Horizontal divider for mobile, vertical for desktop */}
        <div className="block md:hidden h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent my-1"></div>
        <div className="hidden md:block w-px bg-gradient-to-t from-transparent via-emerald-500/50 to-transparent" />

        {/* PDF Viewer Section - Full width on bottom for mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`transition-all duration-300 w-full md:w-[35%] lg:w-[30%] h-3/5 md:h-full relative`}
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
      
      {/* Chat with document popup */}
      <ChatWithDocumentPopup 
        pdfId={storageId} 
        show={true} // Always show on pages view since we're already in detailed view
      />
    </div>
  );
}
