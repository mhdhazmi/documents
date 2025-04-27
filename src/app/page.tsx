"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from 'next/navigation';
import PDFDropzone from "@/components/PDFDropzone";
import UploadButton from "@/components/UploadButton";
import { MessageCircleMore } from "lucide-react";

// Define types for our mutation functions to avoid 'any'
type GenerateUploadUrlFn = () => Promise<string>;
type SendPDFFn = (args: { fileId: string, filename: string, fileSize: number, pageCount: number }) => Promise<string>;
type ProcessPDFFn = (args: { pdfId: string }) => Promise<void>;

export default function App() {
  const router = useRouter();
  const generateUploadUrl = useMutation(api.files.mutations.generateUploadUrl);
  const sendPDF = useMutation(api.pdf.mutations.savePdfMetadata);
  // const processWithMultipleOcrMutation = useMutation(api.ocr.actions.processWithMultipleOcrMutation);
  const workflowOrchMutation = useMutation(api.workflowOrch.workflowOrchMutation);
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Handle redirection using useEffect
  useEffect(() => {
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  }, [redirectUrl, router]);

  async function handleFormSubmit() {
    if (!selectedPDF) return;
    
    setIsLoading(true);
    try {
      // Generate upload URL and upload the PDF
      const postUrl = await (generateUploadUrl as unknown as GenerateUploadUrlFn)();
      
      // Upload the file to storage
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": selectedPDF.type },
        body: selectedPDF,
      });
      const { storageId } = await result.json();
      
      // Save PDF metadata
      const pdfId = await (sendPDF as unknown as SendPDFFn)({
        fileId: storageId,
        filename: selectedPDF.name,
        fileSize: selectedPDF.size,
        pageCount: pageCount || 0
      });
      
      // Reset form state
      setSelectedPDF(null);
      setPageCount(null);
      
      // Start OCR processing in the background
      await (workflowOrchMutation as unknown as ProcessPDFFn)({ pdfId })
        .catch(error => console.error("Error processing OCR:", error));
      
  
    
      
      // Set redirection URL to trigger navigation
      setRedirectUrl(`/pdf/${pdfId}`);
      setIsLoading(false);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setIsLoading(false);
    }
  }

  // Handle chat card click to navigate to chat page
  const handleChatCardClick = async () => {
    // If there's a selected PDF, upload it first and then navigate to chat
    router.push('/chat');
  };

  return (
    <div 
      className="p-4  flex flex-col md:flex-row justify-center h-screen items-center gap-10"
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: "cover",
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <section className="w-[300px] bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-6 border border-white/20 h-100 text-white hover:bg-white/20 transition-colors cursor-pointer">
        <h2 className="text-3xl font-semibold mb-4 text-right">ارفع مستنداتك</h2>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <PDFDropzone
            selectedPDF={selectedPDF}
            setSelectedPDF={setSelectedPDF}
            pageCount={pageCount}
            setPageCount={setPageCount}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
          
          <UploadButton
            selectedPDF={selectedPDF}
            isLoading={isLoading}
            onSubmit={handleFormSubmit}
          />
        </form>
      </section>

      {/* Gold AI card */}
      <section 
        className="w-[300px] shadow-lg rounded-2xl p-6 border border-amber-400 h-100 flex flex-col items-center justify-center"
        style={{ 
          background: 'linear-gradient(145deg, #d4af37 10%, #b8860b 40%)',
          boxShadow: '0 10px 25px -5px rgba(180, 130, 20, 0.5)'
        }}
      >
        <h2 className="text-4xl font-bold mb-4 text-white tracking-wide text-center">الإدارة العامة للذكاء الإصطناعي وتطوير الأعمال</h2>
        
        <p className="text-white font-medium text-center">
         تحويل المستندات إلى نصوص عن طريق الذكاء الإصطناعي
        </p>
      </section>

      {/* Chat card with onClick handler */}
      <section 
        className="w-[300px] bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-6 border border-white/20 h-100 text-white hover:bg-white/20 transition-colors cursor-pointer"
        onClick={handleChatCardClick}
      >
        <h2 className="text-3xl font-semibold mb-4 text-right">تحدث مع مستنداتك</h2>
        <p className="text-white/80 text-right">
          تحدث مع مستنداتك بأسهل طريقة
        </p>
        
        {/* Chat icon from Lucide */}
        <div className="flex justify-center my-15">
          <MessageCircleMore className="w-20 h-20 text-white/80" />
        </div>
      </section>
    </div>
  );
}