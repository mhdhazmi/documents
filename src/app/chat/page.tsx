// src/app/chat/page.tsx - Updated with citation handling
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import ChatInput from "../components/Chatnput";
import ChatMessages from "../components/ChatMessages";
import { Trash2 } from "lucide-react";
import Sources from "../components/Sources";
import PDFViewer, { PDFViewerHandle } from "../components/PDFViewer";
import ChatHeader from "../components/ChatHeader";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface PDF {
  _id: Id<"pdfs">;
  _creationTime: number;
  processingError?: string;
  fileId: Id<"_storage">; // Updated to use proper storage ID type
  filename: string;
  fileSize: number;
  pageCount: number;
  uploadedAt: number;
  status: string;
}

// Polyfill for crypto.randomUUID
const generateUUID = () => {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback implementation if randomUUID is not available
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
};

export default function Chat() {
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [selectedFilename, setSelectedFilename] = useState<string>("");
  const [selectedFileId, setSelectedFileId] = useState<Id<"_storage"> | null>(
    null
  ); // Updated type
  // Store local messages for optimistic updates
  interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: number;
    sessionId: string;
  }
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const router = useRouter();

  // Reference to PDFViewer for page navigation
  const pdfViewerRef = useRef<PDFViewerHandle>(null);

  // Fetch data using Convex queries at the component level
  const sourcesData = useQuery(api.serve.serve.getRagSources, { sessionId });
  const pdfIds = sourcesData?.[sourcesData?.length - 1]?.pdfIds ?? [];
  const pdfsInfo = useQuery(api.pdf.queries.getPdfByIds, { pdfIds }) as
    | PDF[]
    | undefined;
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl,
    selectedFileId ? { fileId: selectedFileId } : "skip"
  );
  
  // Get server messages
  const serverMessages = useQuery(api.serve.serve.retrieveMessages, {
    sessionId,
  });

  // Update PDF URL when fileUrl changes
  useEffect(() => {
    if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [fileUrl]);
  
  // Sync server messages with local messages
  useEffect(() => {
    if (serverMessages && serverMessages.length > 0) {
      // Replace temporary messages with server messages
      // Map server message format to our ChatMessage format
      setLocalMessages(serverMessages.map(msg => ({
        id: msg._id.toString(),
        text: msg.text,
        isUser: msg.isUser,
        timestamp: msg.timestamp,
        sessionId: msg.sessionId || '',
      })));
    }
  }, [serverMessages]);

  // Initialize sessionId after component mounts to avoid SSR issues
  // Also handle PDF selection from localStorage
  useEffect(() => {
    setSessionId(generateUUID());
    
    // Handle PDF document selection with a slight delay
    setTimeout(() => {
      if (typeof window === 'undefined') return;
      
      try {
        // Get PDF ID from localStorage (set by ChatWithDocumentPopup)
        const lastViewedPdfId = localStorage.getItem('lastViewedPdfId');
        
        if (lastViewedPdfId) {
          // Look up the PDF in our sources to find its file ID
          const matchingPdf = pdfsInfo?.find(pdf => pdf._id.toString() === lastViewedPdfId);
          
          if (matchingPdf) {
            // Set the file ID from the PDF record
            setSelectedFileId(matchingPdf.fileId);
            setSelectedFilename(matchingPdf.filename);
            
            // Clear the localStorage entry to avoid unwanted re-loading
            localStorage.removeItem('lastViewedPdfId');
          }
        }
      } catch (error) {
        console.error("Error handling document selection:", error);
      }
    }, 300);
  }, [pdfsInfo]);

  const clearChat = () => {
    setSessionId(generateUUID());
    setPdfUrl("");
    setSelectedFilename("");
    setSelectedFileId(null);
    setLocalMessages([]);
    router.refresh();
  };

  // Handle citation clicks
  const handleCitationClick = (filename: string, pageNumber?: number) => {
    try {
      if (!pdfsInfo) return;

      const targetPdf = pdfsInfo.find((pdf) => pdf?.filename === filename);

      if (!targetPdf) {
        console.warn(`Could not find PDF with filename: ${filename}`);
        return;
      }

      setSelectedFileId(targetPdf.fileId);
      setSelectedFilename(filename);

      // Navigate to the specific page if pageNumber is provided
      if (pageNumber && pdfViewerRef.current) {
        pdfViewerRef.current.goToPage(pageNumber);
      }
    } catch (error) {
      console.error("Error handling citation click:", error);
    }
  };

  // Handle page navigation from Sources component
  const handlePageNavigate = (pageNumber: number) => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.goToPage(pageNumber);
    }
  };
  
  // Note: We're keeping these handlers defined but not using them directly
  // They will be used by other components through the ref

  return (
    <div
      className="min-h-[calc(100vh-4rem)] md:h-full w-full"
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-4rem)] relative">
        {/* PDF Viewer (always takes 1/2 width on desktop) */}
        <div className="md:w-1/2 w-full max-h-[400px] md:max-h-none md:h-full p-3 transition-all duration-500 ease-in-out transform overflow-hidden">
          <PDFViewer
            ref={pdfViewerRef}
            pdfUrl={pdfUrl}
            fitToWidth={true}
            maxScale={2.0}
          />
        </div>
        
        {/* Chat container (always takes 1/2 width on desktop) */}
        <div className="md:w-1/2 w-full transition-all duration-500 ease-in-out p-3 flex flex-col h-auto md:h-full">
          <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-3 border border-white/20 flex-grow flex flex-col overflow-auto md:h-full">
            <ChatHeader />
            <div className="flex-grow overflow-auto">
              <ChatMessages
                messages={localMessages}
                sessionId={sessionId}
                onCitationClick={handleCitationClick}
              />
            </div>
            <Sources
              sessionId={sessionId}
              setPdfUrl={setPdfUrl}
              onPageNavigate={handlePageNavigate}
            />
            
            <div className="flex items-center gap-2 mt-1 justify-center">
              <div className="max-w-[600px] flex-1">
                <ChatInput
                  input={input}
                  setInput={setInput}
                  setMessages={setLocalMessages}
                  sessionId={sessionId}
                />
              </div>
              <Button
                onClick={clearChat}
                variant="destructive"
                size="sm"
                className="bg-emerald-950 hover:bg-emerald-600"
                title="حذف المحادثه"
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Display current PDF filename if available */}
      {selectedFilename && (
        <div 
          className="fixed bottom-4 left-4 bg-emerald-950/90 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full
            animate-in slide-in-from-left duration-300"
        >
          Viewing: {selectedFilename}
        </div>
      )}
    </div>
  );
}
