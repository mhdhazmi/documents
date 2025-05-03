// src/app/pdf/[storageId]/page.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import { streamClean } from './streamClean';
import OCRFilePreview from './OCRfile';
import OCRFileLoading from './components/OCRFileLoading';
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

  // State for the PDF URL
  const [pdfUrl, setPdfUrl] = useState<string>("");
  
  // Query PDF data
  const pdfData = useQuery(api.pdf.queries.getPdf, { 
    pdfId: jobId as Id<"pdfs"> 
  });
 
  // Get the file URL
  const fileUrl = useQuery(api.files.queries.getFileDownloadUrl, 
    pdfData?.fileId ? { fileId: pdfData.fileId } : "skip"
  );

  // State for OCR results with granular loading states
  const [geminiResult, setGeminiResult] = useState<OCRResult>({
    arabic: "",
    english: "",
    keywordsArabic: [],
    keywordsEnglish: []
  });
  
  const [replicateResult, setReplicateResult] = useState<OCRResult>({
    arabic: "",
    english: "",
    keywordsEnglish: [],
    keywordsArabic: []
  });

  // Granular loading states for each component
  const [geminiState, setGeminiState] = useState({
    loading: true,
    arabicReady: false,
    englishReady: false,
    keywordsReady: false
  });
  
  const [replicateState, setReplicateState] = useState({
    loading: true,
    arabicReady: false,
    englishReady: false,
    keywordsReady: false
  });

  useEffect(() => {
    // Set PDF URL when available
    if (fileUrl) {
      setPdfUrl(fileUrl);
    }

    // Process Gemini results
    if (job?.[0]?.ocrStatus === 'completed') {
      if (openaiGeminiResults?.[0]?.cleaningStatus === 'completed') {
        // Set from database if available
        setGeminiResult({
          arabic: openaiGeminiResults[0].cleanedText || "",
          english: openaiGeminiResults[0].englishText || "",
          keywordsArabic: openaiGeminiResults[0].arabicKeywords || [],
          keywordsEnglish: openaiGeminiResults[0].englishKeywords || []
        });
        
        // Mark all components as ready
        setGeminiState({
          loading: false,
          arabicReady: true,
          englishReady: !!openaiGeminiResults[0].englishText,
          keywordsReady: !!(openaiGeminiResults[0].arabicKeywords?.length || openaiGeminiResults[0].englishKeywords?.length)
        });
      } else {
        // Stream from API
        streamClean(jobId as string, 'gemini', result => {
          setGeminiResult(prev => ({...prev, ...result}));
          
          // Update component states as they become ready
          setGeminiState(prev => ({
            ...prev,
            loading: false,
            arabicReady: !!result.arabic,
            englishReady: !!result.english,
            keywordsReady: !!(result.keywordsArabic?.length || result.keywordsEnglish?.length)
          }));
        });
      }
    }
    
    // Process Replicate results
    if (jobReplicate?.[0]?.ocrStatus === 'completed') {
      if (openaiReplicateResults?.[0]?.cleaningStatus === 'completed') {
        // Set from database if available
        setReplicateResult({
          arabic: openaiReplicateResults[0].cleanedText || "",
          english: openaiReplicateResults[0].englishText || "",
          keywordsArabic: openaiReplicateResults[0].arabicKeywords || [],
          keywordsEnglish: openaiReplicateResults[0].englishKeywords || []
        });
        
        // Mark all components as ready
        setReplicateState({
          loading: false,
          arabicReady: true,
          englishReady: !!openaiReplicateResults[0].englishText,
          keywordsReady: !!(openaiReplicateResults[0].arabicKeywords?.length || openaiReplicateResults[0].englishKeywords?.length)
        });
      } else {
        // Stream from API
        streamClean(jobId as string, 'replicate', result => {
          setReplicateResult(prev => ({...prev, ...result}));
          
          // Update component states as they become ready
          setReplicateState(prev => ({
            ...prev,
            loading: false,
            arabicReady: !!result.arabic,
            englishReady: !!result.english,
            keywordsReady: !!(result.keywordsArabic?.length || result.keywordsEnglish?.length)
          }));
        });
      }
    }
  }, [job, jobId, fileUrl, openaiGeminiResults, openaiReplicateResults, jobReplicate]);

  // Render OCR results with intelligent loading components
  const renderGeminiOCR = () => {
    if (geminiState.loading) {
      return <OCRFileLoading closed={true} />;
    }
    
    if (geminiState.arabicReady) {
      return (
        <OCRFilePreview 
          ocrResult={{
            arabic: geminiResult.arabic,
            english: geminiState.englishReady ? geminiResult.english : "",
            keywordsArabic: geminiState.keywordsReady ? geminiResult.keywordsArabic : [],
            keywordsEnglish: geminiState.keywordsReady ? geminiResult.keywordsEnglish : []
          }} 
          closed={true}
        />
      );
    }
    
    return <OCRFileLoading closed={true} />;
  };
  
  const renderReplicateOCR = () => {
    if (replicateState.loading) {
      return <OCRFileLoading closed={false} />;
    }
    
    if (replicateState.arabicReady) {
      return (
        <OCRFilePreview 
          ocrResult={{
            arabic: replicateResult.arabic,
            english: replicateState.englishReady ? replicateResult.english : "",
            keywordsArabic: replicateState.keywordsReady ? replicateResult.keywordsArabic : [],
            keywordsEnglish: replicateState.keywordsReady ? replicateResult.keywordsEnglish : []
          }} 
          closed={false}
        />
      );
    }
    
    return <OCRFileLoading closed={false} />;
  };

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
        {renderGeminiOCR()}
        {renderReplicateOCR()}
      </div>
    </div>
  );
}