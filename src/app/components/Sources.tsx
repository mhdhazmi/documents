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

  // Render a more compact sources UI
  return (
    <div className="mt-1 mb-2 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-1">
        <div className="h-px bg-gradient-to-l from-emerald-500/20 to-transparent flex-grow mr-2"></div>
        <h3 className="text-white/80 text-xs font-medium">المصادر</h3>
        <div className="h-px bg-gradient-to-r from-emerald-500/20 to-transparent flex-grow ml-2"></div>
      </div>
      
      {/* Compact source chips - horizontal list with dropdown for pages */}
      <div className="flex flex-row-reverse flex-wrap gap-1 justify-center">
        {sourceInfos.map((sourceInfo) => (
          <div
            key={sourceInfo.pdfId.toString()}
            className="relative"
          >
            <button
              onClick={() => {
                setSelectedPdfId(sourceInfo.pdfId === selectedPdfId ? null : sourceInfo.pdfId);
                setSelectedPageNumber(null);
              }}
              className={`flex items-center justify-end gap-1 px-2 py-1 rounded-md text-xs
                transition-all duration-200 border
                ${selectedPdfId === sourceInfo.pdfId 
                  ? "bg-emerald-700/50 text-white border-emerald-500/70" 
                  : "bg-emerald-950/70 text-white/80 border-emerald-800/30 hover:bg-emerald-900/70"}`}
              dir="rtl"
              title={sourceInfo.filename}
            >
              <span className="truncate max-w-[80px]">
                {sourceInfo.filename.replace(/\.[^/.]+$/, "")}
              </span>
              <FileText className="w-3 h-3 flex-shrink-0" />
              {sourceInfo.pageRefs.size > 0 && (
                <span className="text-[10px] bg-emerald-600/40 rounded-full w-4 h-4 flex items-center justify-center ml-1">
                  {sourceInfo.pageRefs.size}
                </span>
              )}
            </button>
            
            {/* Dropdown for page numbers - only visible when PDF is selected */}
            {selectedPdfId === sourceInfo.pdfId && sourceInfo.pageRefs.size > 0 && (
              <div className="absolute z-10 top-full mt-1 right-0 bg-emerald-950/90 backdrop-blur-sm rounded border border-emerald-700/40 p-1 shadow-lg animate-in fade-in-50 slide-in-from-top-5 duration-200">
                <div className="text-[10px] text-white/70 mb-1 text-center" dir="rtl">الصفحات</div>
                <div className="flex flex-wrap gap-1 max-w-[150px] justify-center" dir="rtl">
                  {Array.from(sourceInfo.pageRefs)
                    .sort((a, b) => a - b)
                    .map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePageSelect(pageNum);
                        }}
                        className={`w-5 h-5 text-[10px] rounded transition-colors flex items-center justify-center ${
                          selectedPageNumber === pageNum
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-950 text-white/70 hover:bg-emerald-700/50"
                        }`}
                        title={`صفحة ${pageNum}`}
                      >
                        {pageNum}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
