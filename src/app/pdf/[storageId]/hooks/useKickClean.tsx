// src/app/pdf/hooks/useKickClean.tsx
"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { streamCleanPage } from "@/app/pdf/pages/StreamCleanPage";
import { usePageStream } from "@/store/pageStreams";

interface UseKickCleanProps {
  pageId: Id<"pages">;
  src: "gemini" | "replicate";
}

export function useKickClean({ pageId, src }: UseKickCleanProps) {
  const { setChunk, chunks, inFlight, markInFlight, clearInFlight } =
    usePageStream();

  // Monitor OCR status based on source
  const ocrResults = useQuery(
    src === "gemini"
      ? api.ocr.gemini.queries.getPageOcrResults
      : api.ocr.replicate.queries.getPageOcrResults,
    { pageId }
  );

  useEffect(() => {
    const key = `${pageId}_${src}` as const;
    const ocrCompleted = ocrResults?.ocrResults?.ocrStatus === "completed";
    const hasChunk = chunks[key]?.length > 0;

    if (ocrCompleted && !hasChunk && !inFlight.has(key)) {
      markInFlight(key);
      console.log(`Triggering ${src} clean for page ${pageId}`);

      streamCleanPage(pageId, src, (chunk) => {
        setChunk(key, chunk);
      })
        .catch((error) => {
          console.error(`Error streaming ${src} cleanup:`, error);
        })
        .finally(() => {
          clearInFlight(key);
        });
    }
  }, [
    pageId,
    src,
    ocrResults?.ocrResults?.ocrStatus,
    chunks,
    inFlight,
    markInFlight,
    clearInFlight,
    setChunk,
  ]);
}
