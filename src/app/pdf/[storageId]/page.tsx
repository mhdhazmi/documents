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
  const jobId = params.storageId    // → "jh7fs4hq48ahn54m395mjg0vy17egkt9"


  // your data-loading hooks:
  const job = useQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId: jobId as Id<'pdfs'> })
  const jobReplicate = useQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId: jobId as Id<'pdfs'> })
  const openaiGeminiResults = useQuery(api.ocr.openai.queries.getCleanedId, { pdfId: jobId as Id<'pdfs'>, source: 'gemini' })
  const openaiReplicateResults = useQuery(api.ocr.openai.queries.getCleanedId, { pdfId: jobId as Id<'pdfs'>, source: 'replicate' })

  const [pdfUrl, setPdfUrl] = useState<string>("");
   
  // Query the PDF data using the storageId
const pdfData = useQuery(api.pdf.queries.getPdf, { 
    pdfId: jobId as Id<"pdfs"> 
});
 
  // Get the file URL
  const fileUrl = useQuery(api.files.queries.getFileDownloadUrl, 
    pdfData?.fileId ? { fileId: pdfData.fileId } : "skip"
  );



  const [gBuf, setG] = useState('')
  const [rBuf, setR] = useState('')

  

  const gText = gBuf || 'يتم الآن تحليل الملف وتحويله إلى نص'
  const rText = rBuf || 'يتم الآن تحليل الملف وتحويله إلى نص'


    useEffect(() => {
      if (fileUrl) {
          setPdfUrl(fileUrl);
          }

      if (job?.[0]?.ocrStatus === 'completed' && gBuf === "") {
        console.log("Entering Gemini")
        if (openaiGeminiResults?.[0]?.cleaningStatus === 'completed') {
          setG(openaiGeminiResults?.[0]?.cleanedText)
        } else {
          streamClean(jobId as string, 'gemini', chunk => setG(chunk))
        }
      }
      if (jobReplicate?.[0]?.ocrStatus === 'completed' && rBuf === "") {
        console.log("Entering Replicate")
        if (openaiReplicateResults?.[0]?.cleaningStatus === 'completed') {
          setR(openaiReplicateResults?.[0]?.cleanedText)
        } else {
          streamClean(jobId as string, 'replicate', chunk => setR(chunk))
        }
      }
    }, [job, jobId, gBuf, rBuf,fileUrl, openaiGeminiResults, openaiReplicateResults, jobReplicate])



    
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
                <OCRfile textToDisplay={gText} closed={true}></OCRfile>
                <OCRfile textToDisplay={rText} closed={false}></OCRfile>
            </div>
        </div>
    );
};

