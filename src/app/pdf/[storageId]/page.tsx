"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import OCRfile from "./OCRfile";
import PdfPreviewSection from "./components/pdfPreviewSection";
import GlassmorphicProgressStepper, {
  OcrStep,
} from "./components/GlassmorphicProgressStepper";
import { useProgressiveOcr } from "./hooks/useProgressiveOcr";
import ProgressBarOverall from "../../../components/ProgressBarOverall";
import ChatWithDocumentPopup from "../../../components/ChatWithDocumentPopup";

// Create a separate component for the content to avoid conditional hooks
function PdfViewContent({ storageId }: { storageId: string }) {
  const jobId = storageId as Id<"pdfs">;
  const [geminiStep, setGeminiStep] = useState<OcrStep>("uploaded");
  const [replicateStep, setReplicateStep] = useState<OcrStep>("uploaded");
  const [pdfUrl, setPdfUrl] = useState<string>("");

  // Use the progressive OCR hook (placed before any conditionals)
  const {
    geminiText,
    replicateText,
    isGeminiProcessing,
    isReplicateProcessing,
    completionPercentage,
  } = useProgressiveOcr(jobId);

  // Query the PDF data using the storageId
  const pdfData = useQuery(api.pdf.queries.getPdf, {
    pdfId: jobId,
  });

  // Get the file URL
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl,
    pdfData?.fileId ? { fileId: pdfData.fileId as Id<"_storage"> } : "skip"
  );

  // Update the progress steps based on the OCR processing state
  useEffect(() => {
    // Gemini step determination
    if (isGeminiProcessing) {
      if (geminiText && geminiText !== 'جاري تحليل المستند...') {
        setGeminiStep("streaming");
      } else {
        setGeminiStep("processing");
      }
    } else {
      if (geminiText && geminiText !== 'جاري تحليل المستند...') {
        setGeminiStep("completed");
      } else {
        setGeminiStep("uploaded");
      }
    }

    // Replicate step determination
    if (isReplicateProcessing) {
      if (replicateText && replicateText !== 'جاري تحليل المستند...') {
        setReplicateStep("streaming");
      } else {
        setReplicateStep("processing");
      }
    } else {
      if (replicateText && replicateText !== 'جاري تحليل المستند...') {
        setReplicateStep("completed");
      } else {
        setReplicateStep("uploaded");
      }
    }
  }, [geminiText, replicateText, isGeminiProcessing, isReplicateProcessing]);

  // Set PDF URL when file data is available
  useEffect(() => {
    if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [fileUrl]);
  
  return (
    <div
      className="flex flex-col md:flex-row items-start justify-center min-h-screen p-4 overflow-y-auto"
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Overall Processing Progress */}
      <div className="fixed top-4 left-4 right-4 z-50">
        <ProgressBarOverall percentage={completionPercentage} />
      </div>

      <div className="w-full md:w-1/2 mb-4 md:mb-0 mt-12">
        <PdfPreviewSection pdfUrl={pdfUrl} />
      </div>

      <div className="w-full md:w-1/2 pl-0 md:pl-2 mt-12">
        {/* Gemini OCR section */}
        <div className="mb-6">
          <GlassmorphicProgressStepper
            currentStep={geminiStep}
            modelType="gemini"
          />
          <OCRfile
            textToDisplay={geminiText || "يتم الآن تحليل المستند..."}
            closed={true}
            hide={geminiStep !== "completed" && geminiStep !== "streaming"}
          />
        </div>

        {/* Replicate OCR section */}
        <div className="mb-6">
          <GlassmorphicProgressStepper
            currentStep={replicateStep}
            modelType="replicate"
          />
          <OCRfile
            textToDisplay={replicateText || "يتم الآن تحليل المستند..."}
            closed={false}
            hide={replicateStep !== "completed" && replicateStep !== "streaming"}
          />
        </div>
      </div>
      
      {/* Chat with document popup - show when any OCR processing has made progress */}
      <ChatWithDocumentPopup 
        pdfId={jobId} 
        show={completionPercentage >= 20 || geminiStep === "completed" || replicateStep === "completed"}
      />
    </div>
  );
}

export default function PdfView() {
  // Extract the dynamic segment directly
  const params = useParams<{ storageId?: string }>();
  const storageId = params.storageId;

  if (!storageId) {
    console.error("Missing storageId parameter");
    return <div>Missing storageId parameter</div>;
  }

  // Render the content component if we have a valid storageId
  return <PdfViewContent storageId={storageId} />;
}