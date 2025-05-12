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
  const router = useRouter();

  // Reference to PDFViewer for page navigation
  const pdfViewerRef = useRef<PDFViewerHandle>(null);

  // Initialize sessionId after component mounts to avoid SSR issues
  useEffect(() => {
    setSessionId(generateUUID());
  }, []);

  const clearChat = () => {
    setSessionId(generateUUID());
    setPdfUrl("");
    setSelectedFilename("");
    router.refresh();
  };

  // Handle citation clicks
  const handleCitationClick = async (filename: string, pageNumber?: number) => {
    // Find the PDF ID by filename
    const sourcesData = await api.serve.serve.getRagSources({ sessionId });
    const pdfIds = sourcesData?.[sourcesData.length - 1]?.pdfIds ?? [];

    if (pdfIds.length === 0) return;

    // Get all PDFs to find the one with matching filename
    const pdfsInfo = await api.pdf.queries.getPdfByIds({ pdfIds });
    const targetPdf = pdfsInfo?.find((pdf) => pdf?.filename === filename);

    if (!targetPdf) {
      console.warn(`Could not find PDF with filename: ${filename}`);
      return;
    }

    // Get the file URL
    const fileUrl = await api.files.queries.getFileDownloadUrl({
      fileId: targetPdf.fileId,
    });

    if (fileUrl) {
      setPdfUrl(fileUrl);
      setSelectedFilename(filename);

      // Navigate to the specific page if pageNumber is provided
      if (pageNumber && pdfViewerRef.current) {
        pdfViewerRef.current.goToPage(pageNumber);
      }
    }
  };

  // Handle page navigation from Sources component
  const handlePageNavigate = (pageNumber: number) => {
    if (pdfViewerRef.current) {
      pdfViewerRef.current.goToPage(pageNumber);
    }
  };

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
      <div className="flex flex-col md:flex-row h-auto md:h-full">
        <PDFViewer
          ref={pdfViewerRef}
          pdfUrl={pdfUrl}
          fitToWidth={true}
          maxScale={2.0}
        />
        <div className="w-full md:w-full p-3 flex flex-col h-auto md:h-[95%]">
          <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-3 border border-white/20 flex-grow flex flex-col overflow-auto max-h-[80vh] md:max-h-none">
            <ChatHeader />
            <ChatMessages
              sessionId={sessionId}
              onCitationClick={handleCitationClick}
            />
            <Sources
              sessionId={sessionId}
              setPdfUrl={setPdfUrl}
              onPageNavigate={handlePageNavigate}
            />

            <div className="flex items-center gap-2 mb-1 justify-center">
              <div className="max-w-[600px] flex-1">
                <ChatInput
                  input={input}
                  setInput={setInput}
                  setMessages={() => {}}
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
        <div className="fixed bottom-4 left-4 bg-emerald-950/90 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
          Viewing: {selectedFilename}
        </div>
      )}
    </div>
  );
}
