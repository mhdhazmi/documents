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
import { useRef, useEffect } from "react";

export default function PagesView() {
  const params = useParams();
  const storageId = params.storageId as Id<"pdfs">;
  const { page, setPage } = usePdfPage();
  const viewerRef = useRef<PDFViewerHandle>(null);

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

  if (!pdf || !pages) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        Loading...
      </div>
    );
  }

  return (
    <div
      className="h-screen flex gap-2 p-4"
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Progress Bar */}
      <ProgressBarOverall pdfId={storageId} />

      {/* RTL Layout: Accordion on right, Viewer on left */}
      <div className="flex w-full gap-2" dir="rtl">
        {/* PageAccordion */}
        <div className="w-[40%] overflow-y-auto">
          <PageAccordion pages={pages} />
        </div>

        {/* PDFViewer */}
        <div className="flex-1">
          <PDFViewer
            ref={viewerRef}
            pdfUrl={fileUrl || null}
            initialPage={1}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
}
