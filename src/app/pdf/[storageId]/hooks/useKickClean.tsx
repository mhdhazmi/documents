// src/app/pdf/hooks/useKickClean.tsx
"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { streamCleanPage } from "../streamCleanPage";
import { usePageStream } from "@/store/pageStreams";

interface UseKickCleanProps {
  pageId: Id<"pages">;
  src: "gemini" | "replicate";
}

export function useKickClean({ pageId, src }: UseKickCleanProps) {
  // Use selective state extraction to minimize re-renders
  const key = `${pageId}_${src}` as const;
  
  // Get the full state object once - more stable approach
  const { 
    chunks, 
    inFlight,
    setChunk, 
    markInFlight, 
    clearInFlight 
  } = usePageStream();
  
  // Derive values from the state
  const hasChunk = (chunks[key]?.length || 0) > 0;
  const isInFlight = inFlight.has(key);

  // Monitor OCR status based on source
  const ocrResults = useQuery(
    src === "gemini"
      ? api.ocr.gemini.queries.getPageOcrResults
      : api.ocr.replicate.queries.getPageOcrResults,
    { pageId }
  );
  
  // Extract only what we need from the query result
  const ocrStatus = ocrResults?.ocrResults?.ocrStatus;

  // Use effect with ref to track if we've already started the process
  useEffect(() => {
    // Only proceed if OCR is complete, we don't have text yet, and we're not already processing
    const ocrCompleted = ocrStatus === "completed";
    
    if (ocrCompleted && !hasChunk && !isInFlight) {
      // Mark as processing
      markInFlight(key);
      console.log(`Triggering ${src} clean for page ${pageId}`);

      // Start the streaming process
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
    key,
    pageId,
    src,
    ocrStatus,
    hasChunk,
    isInFlight,
    markInFlight,
    clearInFlight,
    setChunk,
  ]);
}
