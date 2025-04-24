// 'use client'

// import React, { useState, useEffect, Suspense } from 'react';
// import { useParams } from 'next/navigation'
// import { useQuery } from 'convex/react';
// import { Id } from "../../../../convex/_generated/dataModel";

// import { api } from '../../../../convex/_generated/api';
// import OCRfile from './OCRfile';
// import SkeletonLoader from './components/SkeletonLoader';

// // PDF Viewer component that loads after Suspense
// const PDFViewer = ({ storageId }: { storageId: string }) => {
//     const [pdfUrl, setPdfUrl] = useState<string | null>(null);
   
//     // Query the PDF data using the storageId
//     const pdfData = useQuery(api.pdf.queries.getPdf, { 
//         pdfId: storageId as Id<"pdfs"> 
//     });
   
//     // Get the file URL
//     const fileUrl = useQuery(api.files.queries.getFileDownloadUrl, 
//         pdfData?.fileId ? { fileId: pdfData.fileId } : "skip"
//     );

//     // Set the URL when available
//     useEffect(() => {
//         if (fileUrl) {
//             setPdfUrl(fileUrl);
//         }
//     }, [fileUrl]);
    
//     return (
//         <div 
//             className='flex flex-col md:flex-row items-start justify-center min-h-screen p-4'
//             style={{
//                 backgroundImage: 'url("/background.png")',
//                 backgroundSize: 'cover',
//                 backgroundPosition: 'center',
//                 backgroundRepeat: 'no-repeat'
//             }}
//         >
//             <div className="w-1/2 pr-2">
//                 {pdfUrl ? (
//                     <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-2 border border-white/20">
//                         <iframe
//                             src={pdfUrl}
//                             title="PDF Viewer"
//                             width="100%"
//                             height="900px"
//                             style={{ border: 'none', borderRadius: '12px' }}
//                         />
//                     </div>
//                 ) : (
//                     <div className="w-full h-[900px] flex items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
//                         Loading PDF...
//                     </div>
//                 )}
//             </div>
//             <div className="w-1/2 pl-2">
//                 <OCRfile OCRid={storageId}></OCRfile>
//             </div>
//         </div>
//     );
// };

// export default function PdfViewerPage() {
//     const { storageId } = useParams<{ storageId: string }>();
    
//     return (
//         <Suspense fallback={<SkeletonLoader />}>
//             <PDFViewer storageId={storageId} />
//         </Suspense>
//     );
// }


'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { Id } from '../../../../convex/_generated/dataModel'
import { api } from '../../../../convex/_generated/api'
import { streamClean } from './streamClean'
import OCRfile from './OCRfile'
import SkeletonLoader from './components/SkeletonLoader'

export default function PdfView() {
  // 1) Extract the dynamic segment directly:
  const params = useParams()
  const jobId = params.storageId    // → "jh7fs4hq48ahn54m395mjg0vy17egkt9"


  // your data-loading hooks:
  const job = useQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId: jobId as Id<'pdfs'> })
  const jobReplicate = useQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId: jobId as Id<'pdfs'> })


  const [gBuf, setG] = useState('')
  const [rBuf, setR] = useState('')

  useEffect(() => {
    if (job?.[0]?.ocrStatus === 'completed' && gBuf === "") {
      console.log("Entering Gemini")
      streamClean(jobId as string, 'gemini', chunk => setG(p => p + chunk))
    }
    if (jobReplicate?.[0]?.ocrStatus === 'completed' && rBuf === "") {
      console.log("Entering Replicate")
      streamClean(jobId as string, 'replicate', chunk => setR(p => p + chunk))
    }
  }, [job, jobId, gBuf, rBuf])

  const gText = gBuf || 'Gemini working…'
  const rText = rBuf || 'Replicate working…'

  return (
    <main className="grid gap-6 md:grid-cols-2 p-4">
      <Panel title="Gemini → OpenAI" text={gText} />
      <Panel title="Replicate → OpenAI" text={rText} />
    </main>
  )
}

function Panel({ title, text }: { title: string; text: string }) {
  return (
    <section className="border rounded-xl shadow p-4">
      <h2 className="font-bold mb-2">{title}</h2>
      <pre className="whitespace-pre-wrap text-sm max-h-[80vh] overflow-auto">
        {text}
      </pre>
    </section>
  )
}
