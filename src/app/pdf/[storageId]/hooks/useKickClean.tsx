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
  
  // Additionally, check for cleaned results with fullText
  const cleanedResults = useQuery(
    api.ocr.openai.queries.getPageCleanedResults,
    { pageId, source: src }
  );
  
  // Extract only what we need from the query result
  const ocrStatus = ocrResults?.ocrResults?.ocrStatus;
  const fullText = cleanedResults?.fullText;
  const cleaningStatus = cleanedResults?.cleaningStatus;

  // Use effect to handle pre-existing fullText
  useEffect(() => {
    // If we have fullText stored in the database and cleaning is completed,
    // use it directly without streaming
    if (
      fullText && 
      cleaningStatus === "completed" && 
      !hasChunk && 
      !isInFlight
    ) {
      console.log(`Using stored fullText for ${src} clean of page ${pageId}`);
      setChunk(key, fullText);
    }
  }, [key, pageId, fullText, cleaningStatus, hasChunk, isInFlight, src, setChunk]);

  // Use effect to handle streaming for cases without fullText
  useEffect(() => {
    // Only proceed if:
    // 1. OCR is complete
    // 2. We don't have the text in our state
    // 3. We're not already processing
    // 4. We don't have stored fullText (this is the key addition)
    const ocrCompleted = ocrStatus === "completed";
    const needsStreaming = ocrCompleted && !hasChunk && !isInFlight && !fullText;
    
    if (needsStreaming) {
      // Mark as processing
      markInFlight(key);
      console.log(`Triggering ${src} clean for page ${pageId} via streaming`);

      // Start the streaming process
      streamCleanPage(pageId.toString(), src, (chunk) => {
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
    fullText,
    hasChunk,
    isInFlight,
    markInFlight,
    clearInFlight,
    setChunk,
  ]);
}
