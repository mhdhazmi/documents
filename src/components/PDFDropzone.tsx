"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from 'react-dropzone';
import { countPdfPages } from "@/utils/pdfUtils";

interface PDFDropzoneProps {
  selectedPDF: File | null;
  setSelectedPDF: (file: File | null) => void;
  pageCount: number | null;
  setPageCount: (count: number | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export default function PDFDropzone({
  selectedPDF,
  setSelectedPDF,
  pageCount,
  setPageCount,
  isLoading,
  setIsLoading
}: PDFDropzoneProps) {
  const PDFInput = useRef<HTMLInputElement>(null);
  const [dropzoneError, setDropzoneError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPDF(file);
      try {
        const count = await countPdfPages(file, setIsLoading);
        setPageCount(count);
      } catch (error) {
        console.error("Error counting pages:", error);
        setPageCount(0);
      }
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setDropzoneError(null);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type !== 'application/pdf') {
        setDropzoneError('Only PDF files are allowed');
        return;
      }
      
      setSelectedPDF(file);
      try {
        const count = await countPdfPages(file, setIsLoading);
        setPageCount(count);
        if (PDFInput.current) {
          // Create a DataTransfer object to set the files
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          PDFInput.current.files = dataTransfer.files;
        }
      } catch (error) {
        console.error("Error counting pages:", error);
        setPageCount(0);
      }
    }
  }, [setSelectedPDF, setPageCount, setIsLoading]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-400 bg-blue-400/10' : 'border-white/30 hover:border-white/50'}
        ${isDragReject ? 'border-red-400 bg-red-400/10' : ''}
        ${selectedPDF ? 'bg-green-400/10 border-green-400' : ''}
      `}
    >
      <input {...getInputProps()} />
      <input
        type="file"
        accept="application/pdf"
        ref={PDFInput}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex flex-col items-center justify-center space-y-2">
        <svg 
          className={`w-12 h-12 mb-3 ${selectedPDF ? 'text-green-400' : 'text-white/70'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        
        {selectedPDF ? (
          <div>
            <p className="text-sm font-medium text-green-400">
              Selected: {selectedPDF.name}
            </p>
            {pageCount !== null && (
              <p className="text-xs text-white/70 mt-1">({pageCount} pages)</p>
            )}
          </div>
        ) : (
          <div>
            <p className="font-medium text-white">
              {isDragActive ? 'Drop the PDF here' : 'Drag & drop a PDF file here'}
            </p>
            <p className="text-xs text-white/70 mt-1">
              or click to select a file
            </p>
            <p className="text-xs font-medium text-white/70 mt-2">
              Only PDF files are accepted
            </p>
          </div>
        )}
        
        {isLoading && (
          <div className="mt-2 flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span className="ml-2 text-sm text-white/80">يتم رفع الملف...</span>
          </div>
        )}
        
        {dropzoneError && (
          <p className="text-sm font-medium text-red-400 mt-2">{dropzoneError}</p>
        )}
      </div>
    </div>
  );
} 