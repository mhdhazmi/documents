'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'
import { streamClean } from './streamClean'
import OCRfile from './OCRfile'
import PdfPreviewSection from './components/pdfPreviewSection'

export default function PdfView() {
  // 1) Extract the dynamic segment directly:
  const params = useParams()
  const jobId = params.storageId as Id<'pdfs'>

  // your data-loading hooks:
  const job = useQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId: jobId })
  const jobReplicate = useQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId: jobId })
  const openaiGeminiResults = useQuery(api.ocr.openai.queries.getCleanedId, { pdfId: jobId, source: 'gemini' })
  const openaiReplicateResults = useQuery(api.ocr.openai.queries.getCleanedId, { pdfId: jobId, source: 'replicate' })

  const [pdfUrl, setPdfUrl] = useState<string>("");
   
  // Query the PDF data using the storageId
  const pdfData = useQuery(api.pdf.queries.getPdf, { 
    pdfId: jobId
  });
 
  // Get the file URL
  const fileUrl = useQuery(api.files.queries.getFileDownloadUrl, 
    pdfData?.fileId ? { fileId: pdfData.fileId } : "skip"
  );

  // Track processing state and results
  const [gBuf, setG] = useState('')
  const [rBuf, setR] = useState('')
  const [isLoadingGemini, setIsLoadingGemini] = useState(false)
  const [isLoadingReplicate, setIsLoadingReplicate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const gText = gBuf || 'يتم الآن تحليل الملف وتحويله إلى نص'
  const rText = rBuf || 'يتم الآن تحليل الملف وتحويله إلى نص'

  // Set PDF URL when file data is available
  useEffect(() => {
    if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [fileUrl]);

  // Handle Gemini OCR results
  useEffect(() => {
    if (job?.[0]?.ocrStatus === 'completed' && gBuf === "" && !isLoadingGemini) {
      // Mark as loading to prevent duplicate requests
      setIsLoadingGemini(true);
      
      if (openaiGeminiResults?.[0]?.cleaningStatus === 'completed') {
        // Use pre-cleaned results if available
        setG(openaiGeminiResults[0].cleanedText);
        setIsLoadingGemini(false);
      } else {
        // Stream clean the results
        streamClean(
          jobId as string, 
          'gemini', 
          chunk => setG(chunk)
        )
        .catch(error => {
          console.error('Error streaming Gemini cleanup:', error);
          setError(`Failed to process Gemini OCR: ${error.message}`);
        })
        .finally(() => {
          setIsLoadingGemini(false);
        });
      }
    }
  }, [job, jobId, gBuf, openaiGeminiResults, isLoadingGemini]);

  // Handle Replicate OCR results
  useEffect(() => {
    if (jobReplicate?.[0]?.ocrStatus === 'completed' && rBuf === "" && !isLoadingReplicate) {
      // Mark as loading to prevent duplicate requests
      setIsLoadingReplicate(true);
      
      if (openaiReplicateResults?.[0]?.cleaningStatus === 'completed') {
        // Use pre-cleaned results if available
        setR(openaiReplicateResults[0].cleanedText);
        setIsLoadingReplicate(false);
      } else {
        // Stream clean the results
        streamClean(
          jobId as string, 
          'replicate', 
          chunk => setR(chunk)
        )
        .catch(error => {
          console.error('Error streaming Replicate cleanup:', error);
          setError(`Failed to process Replicate OCR: ${error.message}`);
        })
        .finally(() => {
          setIsLoadingReplicate(false);
        });
      }
    }
  }, [jobReplicate, jobId, rBuf, openaiReplicateResults, isLoadingReplicate]);

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
      {error && (
        <div className="fixed top-4 right-4 bg-red-600/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
      
      <div className="w-full md:w-1/2 mb-4 md:mb-0">
        <PdfPreviewSection pdfUrl={pdfUrl}/>
      </div>
      
      <div className="w-full md:w-1/2 pl-0 md:pl-2">
        <OCRfile
          textToDisplay={gText}
          closed={true}
          isProcessing={isLoadingGemini}
        />
        <OCRfile
          textToDisplay={rText}
          closed={false}
          isProcessing={isLoadingReplicate}
        />
      </div>
    </div>
  );
}