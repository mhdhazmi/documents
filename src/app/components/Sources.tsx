"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { FileText } from "lucide-react";
import { parseCitations, groupCitationsByFile } from "@/utils/citationParser";

interface SourcesProps {
  sessionId: string;
  setPdfUrl: (url: string) => void;
  onPageNavigate?: (pageNumber: number) => void;
}

interface SourceInfo {
  pdfId: Id<"pdfs">;
  filename: string;
  pageRefs: Set<number>;
}

export default function Sources({
  sessionId,
  setPdfUrl,
  onPageNavigate,
}: SourcesProps) {
  // Fetch all ragSources entries for this session
  const sourcesData = useQuery(api.serve.serve.getRagSources, { sessionId });
  // Use the latest entry's pdfIds or empty array
  const pdfIds: Id<"pdfs">[] =
    sourcesData?.[sourcesData.length - 1]?.pdfIds ?? [];

  // Track which PDF is selected
  const [selectedPdfId, setSelectedPdfId] = useState<Id<"pdfs"> | null>(null);
  const [selectedPageNumber, setSelectedPageNumber] = useState<number | null>(
    null
  );
  const [sourceInfos, setSourceInfos] = useState<SourceInfo[]>([]);

  // Query for all PDFs to get their filenames
  const pdfsInfo = useQuery(
    api.pdf.queries.getPdfByIds,
    pdfIds.length > 0 ? { pdfIds } : "skip"
  );

  // Query metadata and file URL when a PDF is selected
  const pdfMeta = useQuery(
    api.pdf.queries.getPdf,
    selectedPdfId ? { pdfId: selectedPdfId } : "skip"
  );
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl,
    pdfMeta?.fileId ? { fileId: pdfMeta.fileId as Id<"_storage"> } : "skip"
  );

  // Query messages to extract citations
  const messages = useQuery(api.serve.serve.retrieveMessages, { sessionId });

  // Get page references for the session by parsing citations from messages
  useEffect(() => {
    if (pdfsInfo && messages) {
      // Parse citations from all bot messages
      const allCitations = messages
        .filter((msg) => !msg.isUser)
        .flatMap((msg) => parseCitations(msg.text));

      // Group citations by file
      const citationSummary = groupCitationsByFile(allCitations);

      // Create source infos with extracted page references
      const infos: SourceInfo[] = pdfsInfo.map((pdf) => {
        const pdfCitations = citationSummary[pdf.filename] || {
          pages: new Set<number>(),
          totalReferences: 0,
        };

        return {
          pdfId: pdf._id,
          filename: pdf.filename,
          pageRefs: pdfCitations.pages,
        };
      });

      setSourceInfos(infos);
    }
  }, [pdfsInfo, messages]);

  // Whenever fileUrl changes, update the parent PDFViewer
  useEffect(() => {
    if (fileUrl) {
      setPdfUrl(fileUrl);
      // Navigate to specific page if selected
      if (selectedPageNumber && onPageNavigate) {
        onPageNavigate(selectedPageNumber);
      }
    }
  }, [fileUrl, setPdfUrl, selectedPageNumber, onPageNavigate]);

  // If there are no sources yet, render nothing
  if (!pdfIds.length) {
    return null;
  }

  // Handler for page number selection
  const handlePageSelect = (pageNumber: number) => {
    setSelectedPageNumber(pageNumber);
    if (onPageNavigate) {
      onPageNavigate(pageNumber);
    }
  };

  // Render toggle buttons for each PDF source with page references in a wrapped grid layout
  return (
    <div className="mb-4 animate-in fade-in duration-300">
      <h3 className="text-white/80 text-sm mb-2 font-medium text-right">المصادر</h3>
      <div className="rounded-lg p-2">
        <div className="flex flex-row-reverse flex-wrap gap-2 justify-center">
          {sourceInfos.map((sourceInfo) => (
            <div
              key={sourceInfo.pdfId.toString()}
              className={`bg-emerald-950/80 rounded-lg p-2 border transition-all duration-300
                ${selectedPdfId === sourceInfo.pdfId 
                  ? 'border-emerald-500/70 shadow-md shadow-emerald-900/30 scale-100' 
                  : 'border-emerald-700/30 scale-95 hover:scale-100 hover:border-emerald-600/50'}`}
              style={{ minWidth: '120px', maxWidth: '180px' }}
              title={`${sourceInfo.filename} ${selectedPdfId === sourceInfo.pdfId ? '(مختار)' : ''}`}
            >
              {/* PDF Button */}
              <button
                onClick={() => {
                  setSelectedPdfId(sourceInfo.pdfId);
                  setSelectedPageNumber(null); // Reset page selection
                }}
                className={`flex items-center justify-end gap-1 px-2 h-8 w-full rounded-md
                  transition-all duration-200 text-white/80 border border-emerald-700/30
                  ${selectedPdfId === sourceInfo.pdfId 
                    ? "bg-emerald-600/50 text-white" 
                    : "bg-emerald-950 hover:bg-emerald-900/50"}`}
                dir="rtl"
              >
                <span className="truncate max-w-[120px]">
                  {sourceInfo.filename.replace(/\.[^/.]+$/, "")}
                </span>
                <FileText className="w-3 h-3 flex-shrink-0" />
              </button>

              {/* Page Reference Buttons - Show when PDF is selected, no sliding animation */}
              <div className={`overflow-hidden transition-opacity duration-200
                ${selectedPdfId === sourceInfo.pdfId ? 'opacity-100 mt-2' : 'hidden opacity-0'}`}>
                {sourceInfo.pageRefs.size > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mt-1" dir="rtl">
                    {Array.from(sourceInfo.pageRefs)
                      .sort((a, b) => a - b)
                      .map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => handlePageSelect(pageNum)}
                          className={`w-7 h-7 text-xs rounded-full transition-colors flex items-center justify-center ${
                            selectedPageNumber === pageNum
                              ? "bg-emerald-600 text-white"
                              : "bg-emerald-950/90 text-white/70 hover:bg-emerald-700/50"
                          }`}
                          title={`صفحة ${pageNum}`}
                        >
                          {pageNum}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      
    </div>
  );
}
