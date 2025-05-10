// src/app/components/PDFViewer.tsx
"use client";

import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import * as pdfjs from "pdfjs-dist";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string | null;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  fitToWidth?: boolean;
  maxScale?: number;
}

export interface PDFViewerHandle {
  goToPage: (page: number) => void;
}

const PDFViewer = forwardRef<PDFViewerHandle, PDFViewerProps>(
  (
    {
      pdfUrl,
      initialPage = 1,
      onPageChange,
      fitToWidth = true,
      maxScale = 2.0,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const currentPageRef = useRef(initialPage);
    const pdfDocumentRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentFitMode, setCurrentFitMode] = useState(fitToWidth);

    // Update fit mode when prop changes
    useEffect(() => {
      setCurrentFitMode(fitToWidth);
      if (pdfDocumentRef.current) {
        renderPage(currentPageRef.current);
      }
    }, [fitToWidth]);

    // Expose goToPage method via ref
    useImperativeHandle(ref, () => ({
      goToPage: (page: number) => {
        if (pdfDocumentRef.current) {
          renderPage(page);
        }
      },
    }));

    const calculateScale = (
      viewport: pdfjs.PageViewport,
      containerWidth: number,
      containerHeight: number
    ): number => {
      if (!currentFitMode) return 1.0;

      // Calculate scale to fit both width and height
      const widthScale = containerWidth / viewport.width;
      const heightScale = containerHeight / viewport.height;

      // Use the smaller scale to ensure the page fits in both dimensions
      const scale = Math.min(widthScale, heightScale);

      // Clamp the scale between 0.1 and maxScale
      return Math.min(Math.max(scale, 0.1), maxScale);
    };

    const renderPage = async (pageNumber: number) => {
      if (
        !pdfDocumentRef.current ||
        !containerRef.current ||
        !canvasContainerRef.current
      )
        return;

      try {
        setIsLoading(true);
        setError(null);

        const page = await pdfDocumentRef.current.getPage(pageNumber);
        const container = containerRef.current;
        const canvasContainer = canvasContainerRef.current;

        // Get the container dimensions
        const containerWidth = container.clientWidth - 40; // Account for padding
        const containerHeight = container.clientHeight - 40; // Account for padding

        // Get viewport with default scale first
        const viewport = page.getViewport({ scale: 1.0 });

        // Calculate appropriate scale to fit
        const scale = calculateScale(viewport, containerWidth, containerHeight);
        const scaledViewport = page.getViewport({ scale });

        // Create canvas
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        // Clear container and append canvas
        canvasContainer.innerHTML = "";
        canvasContainer.appendChild(canvas);

        // Center the canvas in the container
        canvas.style.display = "block";
        canvas.style.margin = "0 auto";

        // Render page
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        // Update current page and notify parent
        currentPageRef.current = pageNumber;
        onPageChange?.(pageNumber);
      } catch (error) {
        console.error("Error rendering page:", error);
        setError(
          `خطأ في عرض الصفحة: ${error instanceof Error ? error.message : String(error)}`
        );
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      if (!pdfUrl) return;

      let mounted = true;
      const loadPDF = async () => {
        try {
          setIsLoading(true);
          setError(null);

          const pdf = await pdfjs.getDocument(pdfUrl).promise;

          if (!mounted) {
            pdf.destroy();
            return;
          }

          pdfDocumentRef.current = pdf;
          // Render initial page
          await renderPage(initialPage);
        } catch (error) {
          console.error("Error loading PDF:", error);
          if (mounted) {
            setError(
              `خطأ في تحميل الملف: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      };

      loadPDF();

      // Cleanup
      return () => {
        mounted = false;
        if (pdfDocumentRef.current) {
          pdfDocumentRef.current.destroy();
          pdfDocumentRef.current = null;
        }
      };
    }, [pdfUrl, initialPage]);

    // Handle window resize
    useEffect(() => {
      const handleResize = () => {
        if (pdfDocumentRef.current) {
          renderPage(currentPageRef.current);
        }
      };

      let timeoutId: NodeJS.Timeout;
      const debouncedResize = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(handleResize, 150);
      };

      window.addEventListener("resize", debouncedResize);
      return () => {
        window.removeEventListener("resize", debouncedResize);
        clearTimeout(timeoutId);
      };
    }, []);

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

    if (error) {
      return (
        <div className="flex items-center justify-center h-full text-red-400 bg-red-900/10 rounded-lg border border-red-500/20 p-4">
          <div className="text-center">
            <p className="text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full overflow-hidden bg-white/10 rounded-lg p-4"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm rounded-lg z-10">
            <div className="flex items-center gap-3 text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
              <span>جاري تحميل الملف...</span>
            </div>
          </div>
        )}

        <div
          ref={canvasContainerRef}
          className="w-full h-full flex items-center justify-center"
        />

        {pdfUrl && !isLoading && !error && (
          <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
            صفحة {currentPageRef.current} من {pdfDocumentRef.current?.numPages}
          </div>
        )}
      </div>
    );
  }
);

PDFViewer.displayName = "PDFViewer";

export default PDFViewer;
