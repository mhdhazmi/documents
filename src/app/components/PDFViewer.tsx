// src/app/components/PDFViewer.tsx
"use client";

import React, {
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from "react";

interface PDFViewerProps {
  pdfUrl: string | null;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  fitToWidth?: boolean;
  maxScale?: number;
}

export interface PDFViewerHandle {
  goToPage: (page: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  toggleFitToWidth: () => void;
  resetZoom: () => void;
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(0);
    
    // Track zoom level internally
    const [zoomLevel, setZoomLevel] = useState(100);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      // These functions will use postMessage to communicate with the PDF viewer inside the iframe
      goToPage: (page: number) => {
        // Simple but effective - many PDF viewers accept #page=N in the URL hash
        if (iframeRef.current && page >= 1) {
          try {
            // First try to use the iframe's contentWindow.PDFViewerApplication if available
            if (iframeRef.current.contentWindow) {
              // This can only work if the browser doesn't block cross-origin iframe access
              (iframeRef.current.contentWindow as any).location.hash = `#page=${page}`;
              setCurrentPage(page);
              if (onPageChange) onPageChange(page);
            }
          } catch (err) {
            console.warn("Could not directly navigate PDF:", err);
            // Fallback - reload the iframe with the page in the URL
            iframeRef.current.src = `${pdfUrl}#page=${page}`;
            setCurrentPage(page);
          }
        }
      },
      zoomIn: () => {
        setZoomLevel(prev => Math.min(prev + 10, 200));
      },
      zoomOut: () => {
        setZoomLevel(prev => Math.max(prev - 10, 50));
      },
      toggleFitToWidth: () => {
        // Not actually implemented - iframes don't easily support this
        console.log("toggleFitToWidth not available in iframe mode");
      },
      resetZoom: () => {
        setZoomLevel(100);
      }
    }));

    // Handle loading state
    useEffect(() => {
      if (pdfUrl) {
        setIsLoading(true);
        // We'll reset loading state when iframe loads
      } else {
        setIsLoading(false);
      }
    }, [pdfUrl]);
    
    // Show a placeholder when no PDF is loaded
    if (!pdfUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 text-white/70">
          <div className="w-16 h-16 mb-4 opacity-70">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <p className="text-center text-lg font-medium">قم بتحديد ملف PDF</p>
          <p className="text-center text-sm mt-2 max-w-xs opacity-70">
            اختر مستندًا من مصادر المحادثة لعرضه هنا
          </p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex items-center justify-center h-full w-full text-red-400 bg-red-900/10 rounded-lg border border-red-500/20 p-4">
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

    // Use a simple iframe-based PDF viewer
    return (
      <div 
        className="relative w-full h-full overflow-hidden bg-white/10 backdrop-blur-sm rounded-lg p-4 shadow-lg transition-all duration-500 border border-white/20"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm rounded-lg z-20">
            <div className="flex items-center gap-3 text-white">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
              <span>جاري تحميل الملف...</span>
            </div>
          </div>
        )}
        
        {/* PDF iframe with styles based on zoomLevel */}
        <iframe
          ref={iframeRef}
          src={`${pdfUrl}#page=${initialPage}&scrollbars=0&toolbar=0&navpanes=0`}
          className="w-full h-full rounded-lg bg-white overflow-hidden"
          style={{ 
            transform: `scale(${zoomLevel/100})`,
            transformOrigin: 'center top'
          }}
          onLoad={() => {
            setIsLoading(false);
            // Prevent automatic scroll
            if (iframeRef.current && iframeRef.current.contentWindow) {
              try {
                // Try to prevent scrolling in the iframe content
                iframeRef.current.contentWindow.scrollTo(0, 0);
              } catch (err) {
                // Ignore cross-origin errors
              }
            }
          }}
          onError={() => {
            setIsLoading(false);
            setError("خطأ في تحميل الملف");
          }}
        />
      </div>
    );
  }
);

PDFViewer.displayName = "PDFViewer";

export default PDFViewer;