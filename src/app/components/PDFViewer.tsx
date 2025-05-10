// src/app/components/PDFViewer.tsx
"use client";

import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as pdfjs from "pdfjs-dist";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string | null;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

export interface PDFViewerHandle {
  goToPage: (page: number) => void;
}

const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(
  ({ pdfUrl, initialPage = 1, onPageChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const currentPageRef = useRef(initialPage);
    const pdfDocumentRef = useRef<pdfjs.PDFDocumentProxy | null>(null);

    // Expose goToPage method via ref
    useImperativeHandle(ref, () => ({
      goToPage: (page: number) => {
        if (pdfDocumentRef.current) {
          renderPage(page);
        }
      },
    }));

    const renderPage = async (pageNumber: number) => {
      if (!pdfDocumentRef.current || !containerRef.current) return;

      try {
        const page = await pdfDocumentRef.current.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.0 });

        // Set container size
        const container = containerRef.current;
        container.style.width = `${viewport.width}px`;
        container.style.height = `${viewport.height}px`;

        // Create canvas
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Clear container and append canvas
        container.innerHTML = "";
        container.appendChild(canvas);

        // Render page
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Update current page and notify parent
        currentPageRef.current = pageNumber;
        onPageChange?.(pageNumber);
      } catch (error) {
        console.error("Error rendering page:", error);
      }
    };

    useEffect(() => {
      if (!pdfUrl) return;

      const loadPDF = async () => {
        try {
          const pdf = await pdfjs.getDocument(pdfUrl).promise;
          pdfDocumentRef.current = pdf;

          // Render initial page
          renderPage(initialPage);
        } catch (error) {
          console.error("Error loading PDF:", error);
        }
      };

      loadPDF();

      // Cleanup
      return () => {
        if (pdfDocumentRef.current) {
          pdfDocumentRef.current.destroy();
          pdfDocumentRef.current = null;
        }
      };
    }, [pdfUrl]);

    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!pdfDocumentRef.current) return;

        const totalPages = pdfDocumentRef.current.numPages;

        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          if (currentPageRef.current > 1) {
            renderPage(currentPageRef.current - 1);
          }
        } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          if (currentPageRef.current < totalPages) {
            renderPage(currentPageRef.current + 1);
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
      <div className="col-start-1 row-start-1 h-full w-full overflow-auto rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-md">
        {pdfUrl ? (
          <div
            ref={containerRef}
            className="w-full h-full mx-auto"
            style={{ maxWidth: "100%", maxHeight: "100%" }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white">
            <p className="text-center mb-2">اسأل سؤالاً لعرض المستند المناسب</p>
          </div>
        )}
      </div>
    );
  }
);

PDFViewer.displayName = "PDFViewer";

export default PDFViewer;
