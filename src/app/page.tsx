"use client";

import { FormEvent, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { redirect } from 'next/navigation'


export default function App() {
  const generateUploadUrl = useMutation(api.files.mutations.generateUploadUrl);
  const sendPDF = useMutation(api.pdf.mutations.savePdfMetadata);
  const processWithMultipleOcrMutation = useMutation(api.ocr.actions.processWithMultipleOcrMutation);
  const PDFInput = useRef<HTMLInputElement>(null);
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [name] = useState(() => "User " + Math.floor(Math.random() * 10000));

  // Function to count PDF pages using regex
  const countPdfPages = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      setIsLoading(true);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(content);
          let text = "";
          
          // Convert binary data to string
          for (let i = 0; i < bytes.length; i++) {
            text += String.fromCharCode(bytes[i]);
          }
          
          // Use regex to find page count patterns
          // This is a simple approach and may not work for all PDFs
          const pageCountRegex = /\/Count\s+(\d+)/;
          const match = text.match(pageCountRegex);
          
          if (match && match[1]) {
            const count = parseInt(match[1], 10);
            setIsLoading(false);
            resolve(count);
          } else {
            setIsLoading(false);
            console.warn("Could not determine page count");
            resolve(0);
          }
        } catch (error) {
          setIsLoading(false);
          console.error("Error counting PDF pages:", error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        setIsLoading(false);
        reject(error);
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPDF(file);
      try {
        const count = await countPdfPages(file);
        setPageCount(count);
      } catch (error) {
        console.error("Error counting pages:", error);
        setPageCount(0);
      }
    }
  };

  async function handleSendPDF(event: FormEvent) {
    event.preventDefault();

    if (!selectedPDF) return;

    // Step 1: Get a short-lived upload URL
    const postUrl = await generateUploadUrl();
    
    // Step 2: POST the file to the URL
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": selectedPDF.type },
      body: selectedPDF,
    });
    
    const { storageId } = await result.json();
    console.log(storageId);
    
    // Step 3: Save the newly allocated storage id and page count to the database
    const pdfId = await sendPDF({ 
      fileId: storageId, 
      filename: selectedPDF.name, 
      fileSize: selectedPDF.size,
      pageCount: pageCount || 0
    });

    setSelectedPDF(null);
    setPageCount(null);
    PDFInput.current!.value = "";
    await processWithMultipleOcrMutation({ pdfId: pdfId });
    redirect(`/pdf/${pdfId}`);
  }

  return (
    <div className="p-4">
      <form onSubmit={handleSendPDF} className="space-y-4">
        <div>
          <input
            className="bg-amber-950 block w-full p-2 text-white"
            type="file"
            accept="application/pdf"
            ref={PDFInput}
            onChange={handleFileSelect}
            disabled={isLoading}
          />
          {isLoading && <p className="mt-2">Counting pages...</p>}
          {pageCount !== null && (
            <p className="mt-2">PDF has {pageCount} pages</p>
          )}
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={selectedPDF === null || isLoading}
        >
          Upload file
        </button>
      </form>
    </div>
  );
}