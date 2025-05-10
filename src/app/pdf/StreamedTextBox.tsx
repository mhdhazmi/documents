// src/app/pdf/StreamedTextBox.tsx
"use client";

import { Id } from "../../../convex/_generated/dataModel";
import { usePageStream, selectChunk } from "@/store/pageStreams";
import TypingIndicator from "@/app/components/TypingIndicator";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface StreamedTextBoxProps {
  pageId: Id<"pages">;
  src: "gemini" | "replicate";
}

export default function StreamedTextBox({ pageId, src }: StreamedTextBoxProps) {
  // Get streaming text from store
  const chunks = usePageStream((state) => selectChunk(pageId, src)(state));

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
  const hasText = chunks.length > 0;

  return (
    <div className="relative">
      {!hasText && !isCompleted ? (
        <div className="min-h-[80px] flex items-center justify-center bg-emerald-950/10 backdrop-blur-md rounded-lg border border-emerald-800/20 p-4">
          <TypingIndicator />
        </div>
      ) : (
        <pre className="min-h-[80px] max-h-[200px] overflow-y-auto text-white/90 bg-emerald-950/10 backdrop-blur-md rounded-lg border border-emerald-800/20 p-4 text-right font-sans text-sm whitespace-pre-wrap">
          {chunks || "يتم الآن معالجة النصوص..."}
        </pre>
      )}
    </div>
  );
}
