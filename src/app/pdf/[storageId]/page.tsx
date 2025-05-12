"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { streamClean } from "./streamClean";
import OCRfile from "./OCRfile";
import PdfPreviewSection from "./components/pdfPreviewSection";
import GlassmorphicProgressStepper, {
  OcrStep,
} from "./components/GlassmorphicProgressStepper";

export default function PdfView() {
  // Extract the dynamic segment directly
  const params = useParams<{ storageId?: string }>();
  const storageId = params.storageId;
  if (!storageId) {
    throw new Error("Missing storageId parameter");
  }
  const jobId = storageId as Id<"pdfs">;
  // redirect(`/pdf/${jobId}/pages`);

  // Data-loading hooks
  const job = useQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId: jobId });
  const jobReplicate = useQuery(api.ocr.replicate.queries.getOcrByPdfId, {
    pdfId: jobId,
  });
  const openaiGeminiResults = useQuery(api.ocr.openai.queries.getCleanedId, {
    pdfId: jobId,
    source: "gemini",
  });
  const openaiReplicateResults = useQuery(api.ocr.openai.queries.getCleanedId, {
    pdfId: jobId,
    source: "replicate",
  });

  const [pdfUrl, setPdfUrl] = useState<string>("");

  // Initialize state after data is loaded
  const [initialized, setInitialized] = useState(false);

  // Track processing state and results
  const [gBuf, setG] = useState("");
  const [rBuf, setR] = useState("");
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);
  const [isLoadingReplicate, setIsLoadingReplicate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track progress steps - don't set initial value yet
  const [geminiStep, setGeminiStep] = useState<OcrStep>("uploaded");
  const [replicateStep, setReplicateStep] = useState<OcrStep>("uploaded");

  // Query the PDF data using the storageId
  const pdfData = useQuery(api.pdf.queries.getPdf, {
    pdfId: jobId,
  });

  // Get the file URL
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl,
    pdfData?.fileId ? { fileId: pdfData.fileId as Id<"_storage"> } : "skip"
  );

  // Initialize state based on query results
  useEffect(() => {
    // Only initialize once all data is available
    if (
      !initialized &&
      job !== undefined &&
      jobReplicate !== undefined &&
      openaiGeminiResults !== undefined &&
      openaiReplicateResults !== undefined
    ) {
      console.log("Initializing with data:", {
        geminiStatus: openaiGeminiResults?.[0]?.cleaningStatus,
        replicateStatus: openaiReplicateResults?.[0]?.cleaningStatus,
        geminiOcr: job?.[0]?.ocrStatus,
        replicateOcr: jobReplicate?.[0]?.ocrStatus,
      });

      // Set initial Gemini state
      if (openaiGeminiResults?.[0]?.cleaningStatus === "completed") {
        setGeminiStep("completed");
        setG(openaiGeminiResults[0].cleanedText || "");
        console.log("Setting initial Gemini step to completed");
      } else if (job?.[0]?.ocrStatus === "completed") {
        setGeminiStep("streaming");
      } else if (job?.[0]?.ocrStatus === "processing") {
        setGeminiStep("processing");
      } else {
        setGeminiStep("uploaded");
      }

      // Set initial Replicate state
      if (openaiReplicateResults?.[0]?.cleaningStatus === "completed") {
        setR(openaiReplicateResults[0].cleanedText || "");
        setReplicateStep("completed");
        console.log("Setting initial Replicate step to completed");
      } else if (jobReplicate?.[0]?.ocrStatus === "completed") {
        setReplicateStep("streaming");
      } else if (jobReplicate?.[0]?.ocrStatus === "processing") {
        setReplicateStep("processing");
      } else {
        setReplicateStep("uploaded");
      }

      setInitialized(true);
      console.log("Initialization complete");
    }
  }, [
    job,
    jobReplicate,
    openaiGeminiResults,
    openaiReplicateResults,
    initialized,
  ]);

  const gText = gBuf || "يتم الآن تحليل الملف وتحويله إلى نص";
  const rText = rBuf || "يتم الآن تحليل الملف وتحويله إلى نص";

  // Set PDF URL when file data is available
  useEffect(() => {
    if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [fileUrl]);

  // Handle Gemini OCR processing - only run after initialization and if not already completed
  useEffect(() => {
    if (!initialized || geminiStep === "completed") return;

    // If OCR is completed but we don't have results yet, start streaming
    if (
      job?.[0]?.ocrStatus === "completed" &&
      gBuf === "" &&
      !isLoadingGemini
    ) {
      console.log("Starting Gemini streaming process");
      setGeminiStep("streaming");
      setIsLoadingGemini(true);

      // Stream clean the results
      streamClean(jobId as string, "gemini", (chunk) => {
        setG(chunk);
        if (chunk.length > 0) {
          console.log("Gemini stream data received, setting to completed");
          setGeminiStep("completed");
        }
      })
        .catch((error) => {
          console.error("Error streaming Gemini cleanup:", error);
          setError(`Failed to process Gemini OCR: ${error.message}`);
        })
        .finally(() => {
          setIsLoadingGemini(false);
        });
    }
  }, [initialized, job, jobId, gBuf, isLoadingGemini, geminiStep]);

  // Handle Replicate OCR processing - only run after initialization and if not already completed
  useEffect(() => {
    if (!initialized || replicateStep === "completed") return;

    // If OCR is completed but we don't have results yet, start streaming
    if (
      jobReplicate?.[0]?.ocrStatus === "completed" &&
      rBuf === "" &&
      !isLoadingReplicate
    ) {
      console.log("Starting Replicate streaming process");
      setReplicateStep("streaming");
      setIsLoadingReplicate(true);

      // Stream clean the results
      streamClean(jobId as string, "replicate", (chunk) => {
        setR(chunk);
        if (chunk.length > 0) {
          console.log("Replicate stream data received, setting to completed");
          setReplicateStep("completed");
        }
      })
        .catch((error) => {
          console.error("Error streaming Replicate cleanup:", error);
          setError(`Failed to process Replicate OCR: ${error.message}`);
        })
        .finally(() => {
          setIsLoadingReplicate(false);
        });
    }
  }, [
    initialized,
    jobReplicate,
    jobId,
    rBuf,
    isLoadingReplicate,
    replicateStep,
  ]);

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

      <div className="w-full md:w-1/2 mb-4 md:mb-0">
        <PdfPreviewSection pdfUrl={pdfUrl} />
      </div>

      <div className="w-full md:w-1/2 pl-0 md:pl-2">
        {/* Gemini OCR section */}
        <div className="mb-6">
          <GlassmorphicProgressStepper
            currentStep={geminiStep}
            modelType="gemini"
          />
          <OCRfile
            textToDisplay={gText}
            closed={true}
            hide={geminiStep !== "completed"}
          />
        </div>

        {/* Replicate OCR section */}
        <div className="mb-6">
          <GlassmorphicProgressStepper
            currentStep={replicateStep}
            modelType="replicate"
          />
          <OCRfile
            textToDisplay={rText}
            closed={false}
            hide={replicateStep !== "completed"}
          />
        </div>
      </div>
    </div>
  );
}
