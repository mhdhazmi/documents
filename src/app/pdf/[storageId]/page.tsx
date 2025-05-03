'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import { streamClean } from './streamClean';
import OCRFilePreview from './OCRfile';
import PdfPreviewSection from './components/pdfPreviewSection';
import { OCRResult } from '../../../../convex/ocrSchema';

export default function PdfView() {
  const params = useParams();
  const jobId = params.storageId;

  // Query OCR job statuses
  const job = useQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId: jobId as Id<'pdfs'> });
  const jobReplicate = useQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId: jobId as Id<'pdfs'> });
  const openaiGeminiResults = useQuery(api.ocr.openai.queries.getCleanedId, { pdfId: jobId as Id<'pdfs'>, source: 'gemini' });
  const openaiReplicateResults = useQuery(api.ocr.openai.queries.getCleanedId, { pdfId: jobId as Id<'pdfs'>, source: 'replicate' });

  // State for the PDF URL and OCR results
  const [pdfUrl, setPdfUrl] = useState<string>("");
  
  // Query PDF data
  const pdfData = useQuery(api.pdf.queries.getPdf, { 
    pdfId: jobId as Id<"pdfs"> 
  });
 
  // Get the file URL
  const fileUrl = useQuery(api.files.queries.getFileDownloadUrl, 
    pdfData?.fileId ? { fileId: pdfData.fileId } : "skip"
  );

  // State for OCR results
  const [geminiResult, setGeminiResult] = useState<OCRResult>({
    arabic: "",
    english: "",
    keywordsArabic: [], // Ensure initialized as empty array
    keywordsEnglish: [] // Ensure initialized as empty array
  });
  
  const [replicateResult, setReplicateResult] = useState<OCRResult>({
    arabic: "",
    english: "",
    keywordsArabic: [], // Ensure initialized as empty array
    keywordsEnglish: [] // Ensure initialized as empty array
  });

  useEffect(() => {
    // Set PDF URL when available
    if (fileUrl) {
      setPdfUrl(fileUrl);
    }

    // Process Gemini results
    if (job?.[0]?.ocrStatus === 'completed' && geminiResult.arabic === "") {
      if (openaiGeminiResults?.[0]?.cleaningStatus === 'completed') {
        // Set from database if available
        setGeminiResult({
          arabic: openaiGeminiResults[0].cleanedText || "",
          english: openaiGeminiResults[0].englishText || "",
          keywordsArabic: openaiGeminiResults[0].arabicKeywords || [],
          keywordsEnglish: openaiGeminiResults[0].englishKeywords || []
        });
      } else {
        // Stream from API
        streamClean(jobId as string, 'gemini', result => setGeminiResult(result));
      }
    }
    
    // Process Replicate results
    if (jobReplicate?.[0]?.ocrStatus === 'completed' && replicateResult.arabic === "") {
      if (openaiReplicateResults?.[0]?.cleaningStatus === 'completed') {
        // Set from database if available
        setReplicateResult({
          arabic: openaiReplicateResults[0].cleanedText || "",
          english: openaiReplicateResults[0].englishText || "",
          keywordsArabic: openaiReplicateResults[0].arabicKeywords || [],
          keywordsEnglish: openaiReplicateResults[0].englishKeywords || []
        });
      } else {
        // Stream from API
        streamClean(jobId as string, 'replicate', result => setReplicateResult(result));
      }
    }
  }, [job, jobId, fileUrl, openaiGeminiResults, openaiReplicateResults, jobReplicate, geminiResult.arabic, replicateResult.arabic]);

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
      <div className="w-full md:w-1/2 mb-4 md:mb-0">
        <PdfPreviewSection pdfUrl={pdfUrl}/>
      </div>
      <div className="w-full md:w-1/2 pl-0 md:pl-2">
        <OCRFilePreview ocrResult={geminiResult} closed={true}/>
        <OCRFilePreview ocrResult={replicateResult} closed={false}/>
      </div>
    </div>
  );
}