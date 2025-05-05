// src/app/pdf/[storageId]/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'
import OCRfile from './OCRfile'
import PdfPreviewSection from './components/pdfPreviewSection'
import { useOcrProcessing } from './hooks/useOcrProcessing'
import ErrorAlert from './components/ErrorAlert'

export default function PdfView() {
  // Extract PDF ID from URL parameters
  const params = useParams();
  const pdfId = params.storageId as Id<'pdfs'>;
  
  // Get PDF file URL for preview
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const pdfData = useQuery(api.pdf.queries.getPdf, { pdfId });
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl, 
    pdfData?.fileId ? { fileId: pdfData.fileId } : "skip"
  );
  
  // Use our custom hook for OCR processing
  const { 
    geminiText, 
    replicateText, 
    isGeminiProcessing,
    isReplicateProcessing,
    error 
  } = useOcrProcessing(pdfId);

  // Update PDF URL when file URL is available
  useEffect(() => {
    if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [fileUrl]);

  return (
    <div 
      className='flex flex-col md:flex-row items-start justify-center min-h-screen p-4 overflow-y-auto'
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {error && <ErrorAlert message={error} />}
      
      <div className="w-full md:w-1/2 mb-4 md:mb-0">
        <PdfPreviewSection pdfUrl={pdfUrl} />
      </div>
      
      <div className="w-full md:w-1/2 pl-0 md:pl-2">
        <OCRfile 
          textToDisplay={geminiText} 
          closed={true} 
          isProcessing={isGeminiProcessing}
        />
        <OCRfile 
          textToDisplay={replicateText} 
          closed={false} 
          isProcessing={isReplicateProcessing}
        />
      </div>
    </div>
  );
}