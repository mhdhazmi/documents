// src/app/pdf/hooks/useKickClean.tsx
"use client";

import { useEffect, useRef } from "react";
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
  const { setChunk, chunks } = usePageStream();
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Monitor OCR status based on source
  const ocrResults = useQuery(
    src === "gemini"
      ? api.ocr.gemini.queries.getPageOcrResults
      : api.ocr.replicate.queries.getPageOcrResults,
    { pageId }
  );

  useEffect(() => {
    const key = `${pageId}_${src}`;
    const ocrCompleted = ocrResults?.ocrResults?.ocrStatus === "completed";
    const hasChunk = chunks[key]?.length > 0;

    if (ocrCompleted && !hasChunk) {
      console.log(`Triggering ${src} clean for page ${pageId}`);

      const attemptStream = async () => {
        try {
          await streamCleanPage(pageId, src, (chunk) => {
            setChunk(key, chunk);
          });
          retryCount.current = 0; // Reset on success
        } catch (error) {
          console.error(`Error streaming ${src} cleanup:`, error);

          // Simple retry logic
          if (retryCount.current < maxRetries) {
            retryCount.current++;
            console.log(
              `Retrying ${src} clean for page ${pageId} (attempt ${retryCount.current}/${maxRetries})`
            );

            // Exponential backoff: 2s, 4s, 8s
            const delay = 2000 * Math.pow(2, retryCount.current - 1);
            setTimeout(attemptStream, delay);
          } else {
            console.error(
              `Max retries reached for ${src} clean on page ${pageId}`
            );
          }
        }
      };

      attemptStream();
    }
  }, [pageId, src, ocrResults?.ocrResults?.ocrStatus, chunks, setChunk]);
}
