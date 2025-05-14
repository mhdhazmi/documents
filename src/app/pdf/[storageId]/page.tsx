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

export default function PdfView() {
  // Extract the dynamic segment directly
  const params = useParams<{ storageId?: string }>();
  const storageId = params.storageId;
  if (!storageId) {
    throw new Error("Missing storageId parameter");
  }
  const jobId = storageId as Id<"pdfs">;

  // Use the new progressive OCR hook
  const {
    geminiText,
    replicateText,
    isGeminiProcessing,
    isReplicateProcessing,
    completionPercentage,
    error
  } = useProgressiveOcr(jobId);

  // Track progress steps - derive from the processing state
  const [geminiStep, setGeminiStep] = useState<OcrStep>("uploaded");
  const [replicateStep, setReplicateStep] = useState<OcrStep>("uploaded");
  const [pdfUrl, setPdfUrl] = useState<string>("");

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

  // Always render with current state
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
      {error && (
        <div className="fixed top-4 right-4 bg-red-600/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

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