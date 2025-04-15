'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'
import { useQuery } from 'convex/react';
import { Id } from "../../../../convex/_generated/dataModel";

import { api } from '../../../../convex/_generated/api';
import OCRfile from './OCRfile';


export default function PdfViewerIframe() {
    const { storageId } = useParams<{ storageId: string }>();
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    console.log("Storage ID:", storageId);
   
    // Query the PDF data using the storageId
    const pdfData = useQuery(api.pdf.queries.getPdf, { 
        pdfId: storageId as Id<"pdfs"> 
    });
   
    console.log("PDF Data:", pdfData);

    // Get the file URL
    const fileUrl = useQuery(api.files.queries.getFileDownloadUrl, 
        pdfData?.fileId ? { fileId: pdfData.fileId } : "skip"
    );

    // Set the URL when available
    useEffect(() => {
        if (fileUrl) {
            setPdfUrl(fileUrl);
        }
    }, [fileUrl]);
    
    return (
        <div className='flex flex-row items-start justify-center h-screen p-4'>
            <div className="w-1/2 pr-2">
                {pdfUrl ? (
                    <iframe
                        src={pdfUrl}
                        title="PDF Viewer"
                        width="100%"
                        height="900px"
                        style={{ border: 'none' }}
                    />
                ) : (
                    <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
                        Loading PDF...
                    </div>
                )}
            </div>
            <div className="w-1/2 pl-2">
                <OCRfile OCRid={storageId}></OCRfile>
            </div>
        </div>
    );
}