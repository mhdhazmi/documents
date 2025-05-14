// src/app/pdf/StreamedTextBox.tsx
"use client";

import React from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { usePageStream, selectChunk } from "@/store/pageStreams";
import TypingIndicator from "@/app/components/TypingIndicator";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface StreamedTextBoxProps {
  pageId: Id<"pages">;
  src: "gemini" | "replicate";
}

export default React.memo(function StreamedTextBox({ pageId, src }: StreamedTextBoxProps) {
  // Get the chunks directly from the store
  const { chunks: allChunks } = usePageStream();
  const key = `${pageId}_${src}`;
  // Extract the specific chunk we need
  const chunks = allChunks[key] || "";

  // Get cleaning status for this page
  const pageResults = useQuery(
    src === "gemini"
      ? api.ocr.gemini.queries.getPageOcrResults
      : api.ocr.replicate.queries.getPageOcrResults,
    { pageId }
  );

  const cleaningResults = useQuery(
    api.ocr.openai.queries.getPageCleanedResults,
    {
      pageId,
      source: src,
    }
  );

  const isCompleted = cleaningResults?.cleaningStatus === "completed";
  const hasText = chunks && chunks.length > 0;
  const ocrStatus = pageResults?.ocrResults?.ocrStatus;

  // Determine status icon and message
  let statusIcon;
  let statusMessage;

  if (isCompleted) {
    statusIcon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
    statusMessage = "اكتملت المعالجة";
  } else if (ocrStatus === "failed") {
    statusIcon = <AlertCircle className="w-4 h-4 text-red-400" />;
    statusMessage = "فشلت المعالجة";
  } else if (ocrStatus === "completed" && !hasText) {
    statusIcon = <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    statusMessage = "جاري تنقيح النص...";
  } else if (ocrStatus === "processing") {
    statusIcon = <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />;
    statusMessage = "جاري معالجة النص...";
  } else {
    statusIcon = <div className="w-4 h-4 rounded-full bg-gray-400/30" />;
    statusMessage = "في انتظار المعالجة...";
  }

  return (
    <div className="relative space-y-2">
      {/* Status Header */}
      <div className="flex items-center gap-2 text-xs text-white/70">
        {statusIcon}
        <span>{statusMessage}</span>
      </div>

      {/* Text Content */}
      {!hasText && !isCompleted ? (
        <div className="min-h-[100px] flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
          <TypingIndicator />
        </div>
      ) : (
        <div className="overflow-hidden">
          <pre className="min-h-[100px] max-h-[250px] overflow-y-auto text-white/90 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-right font-sans text-xl whitespace-pre-wrap leading-relaxed">
            {chunks || "في انتظار المعالجة..."}
          </pre>
        </div>
      )}
    </div>
  );
});
