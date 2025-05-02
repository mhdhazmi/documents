"use client"

import React, { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Toggle } from "@/components/ui/toggle"

interface SourcesProps {
  sessionId: string;
  setPdfUrl: (url: string) => void;
}

export default function Sources({ sessionId, setPdfUrl }: SourcesProps) {
  // Fetch all ragSources entries for this session
  const sourcesData = useQuery(api.serve.serve.getRagSources, { sessionId });
  // Use the latest entry's pdfIds or empty array
  const pdfIds: Id<'pdfs'>[] = sourcesData?.[sourcesData.length - 1]?.pdfIds ?? [];

  // Track which PDF is selected
  const [selectedPdfId, setSelectedPdfId] = useState<Id<'pdfs'> | null>(null);

  // Query metadata and file URL when a PDF is selected
  const pdfMeta = useQuery(api.pdf.queries.getPdf, selectedPdfId ? { pdfId: selectedPdfId } : 'skip');
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl,
    pdfMeta?.fileId ? { fileId: pdfMeta.fileId } : 'skip'
  );

  // Whenever fileUrl changes, update the parent PDFViewer
  useEffect(() => {
    if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [fileUrl, setPdfUrl]);

  // If there are no sources yet, render nothing
  if (!pdfIds.length) {
    return null;
  }

  // Render toggle buttons for each PDF source
  return (
    <div className="mb-4 animate-in fade-in duration-300">
      <div className="flex flex-wrap gap-2">
        {pdfIds.map((id) => (
          <Toggle
            key={id.toString()}
            pressed={selectedPdfId === id}
            onPressedChange={() => setSelectedPdfId(id)}
            variant="outline"
            className="bg-emerald-950 border-emerald-700/90 text-white/50 h-8 w-20 p-5 rounded-3xl
              data-[state=on]:bg-emerald-600/50 data-[state=on]:text-white 
              transition-colors duration-200"
          >
            المصدر
          </Toggle>
        ))}
      </div>
    </div>
  );
} 