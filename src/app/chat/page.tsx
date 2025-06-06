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
import { useQuery, useMutation } from "convex/react";
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
  
  // Effect to sync messages from the server
  useEffect(() => {
    // Skip if serverMessages isn't available yet
    if (!serverMessages) {
      console.log("Chat page: No server messages available yet, sessionId:", sessionId);
      return;
    }
    
    console.log("Chat page: Received server messages:", serverMessages.length, "for sessionId:", sessionId);
    
    // Convert server messages to client format
    const formattedMessages = serverMessages.map(msg => ({
      id: msg._id.toString(),
      text: msg.text,
      isUser: msg.isUser,
      timestamp: msg.timestamp,
      sessionId: msg.sessionId || '',
    }));
    
    // Update local state
    setLocalMessages(formattedMessages);
    console.log("Chat page: Updated localMessages:", formattedMessages.length);
    
  }, [serverMessages, sessionId]); // This dependency is safe because useQuery caches the reference

  // Get the chat session creation mutation
  const saveSessionId = useMutation(api.serve.serve.saveSessionId);
  
  // Initialize sessionId after component mounts to avoid SSR issues
  // Also handle PDF selection from localStorage
  useEffect(() => {
    // Only initialize sessionId if it's not already set
    if (!sessionId) {
      const newSessionId = generateUUID();
      console.log("Chat page: Generated new sessionId:", newSessionId);
      setSessionId(newSessionId);
      
      // Save the session ID to Convex
      saveSessionId({ sessionId: newSessionId })
        .then(() => console.log("Chat page: Saved sessionId to Convex:", newSessionId))
        .catch(err => console.error("Chat page: Failed to save sessionId:", err));
    }
    // We intentionally omit sessionId and saveSessionId from dependencies
    // to prevent recreation of sessionId on subsequent renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to ensure it only runs once on mount
  
  // Handle PDF selection separately to avoid sessionId regeneration
  useEffect(() => {
    if (!sessionId || !pdfsInfo) return; // Skip if sessionId not yet initialized
    
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
  }, [pdfsInfo, sessionId]);

  const clearChat = () => {
    // Generate a new session ID and save it
    const newSessionId = generateUUID();
    setSessionId(newSessionId);
    
    // Save the new session ID to Convex
    saveSessionId({ sessionId: newSessionId });
    
    // Clear other state
    setPdfUrl("");
    setSelectedFilename("");
    setSelectedFileId(null);
    setLocalMessages([]);
    
    // Force a refresh
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
      className="min-h-screen flex-grow w-full" // Use flex-grow instead of fixed height
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="flex flex-col md:flex-row h-[calc(100vh-60px)] md:h-[calc(100vh-56px)] relative"> {/* Precise height calculation */}
        {/* PDF Viewer (always takes 1/2 width on desktop) */}
        <div className="md:w-1/2 w-full max-h-[450px] md:max-h-none md:h-full p-2 transition-all duration-500 ease-in-out transform overflow-hidden"> {/* Increased max-height, reduced padding */}
          <PDFViewer
            ref={pdfViewerRef}
            pdfUrl={pdfUrl}
            fitToWidth={true}
            maxScale={2.0}
          />
        </div>
        
        {/* Chat container (always takes 1/2 width on desktop) */}
        <div className="md:w-1/2 w-full transition-all duration-500 ease-in-out p-2 flex flex-col h-auto md:h-full"> {/* Reduced padding */}
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
