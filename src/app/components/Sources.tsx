"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Toggle } from "@/components/ui/toggle";
import { FileText, Hash } from "lucide-react";
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

  // Render toggle buttons for each PDF source with page references
  return (
    <div className="mb-4 animate-in fade-in duration-300">
      <div className="space-y-2">
        {sourceInfos.map((sourceInfo) => (
          <div
            key={sourceInfo.pdfId.toString()}
            className="border-l-2 border-emerald-700/30 pl-2"
          >
            {/* PDF Toggle Button */}
            <Toggle
              pressed={selectedPdfId === sourceInfo.pdfId}
              onPressedChange={() => {
                setSelectedPdfId(sourceInfo.pdfId);
                setSelectedPageNumber(null); // Reset page selection
              }}
              variant="outline"
              className="bg-emerald-950 border-emerald-700/90 text-white/80 h-8 justify-start gap-2
                data-[state=on]:bg-emerald-600/50 data-[state=on]:text-white 
                transition-colors duration-200"
            >
              <FileText className="w-3 h-3" />
              <span className="truncate max-w-[150px]">
                {sourceInfo.filename.replace(/\.[^/.]+$/, "")}
              </span>
            </Toggle>

            {/* Page Reference Buttons */}
            {selectedPdfId === sourceInfo.pdfId &&
              sourceInfo.pageRefs.size > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 ml-6">
                  {Array.from(sourceInfo.pageRefs)
                    .sort((a, b) => a - b)
                    .map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => handlePageSelect(pageNum)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          selectedPageNumber === pageNum
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-950/50 text-white/70 hover:bg-emerald-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Hash className="w-2 h-2" />
                          {pageNum}
                        </div>
                      </button>
                    ))}
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Citation Format Example (for testing) */}
      {selectedPdfId && selectedPageNumber && (
        <div className="mt-2 text-xs text-white/50 border-t border-white/10 pt-2">
          Citation: (
          {sourceInfos.find((s) => s.pdfId === selectedPdfId)?.filename}, p.{" "}
          {selectedPageNumber})
        </div>
      )}
    </div>
  );
}
