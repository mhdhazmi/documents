// First, let's create a custom hook for OCR processing

// src/app/pdf/[storageId]/hooks/useOcrProcessing.ts
import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { streamCleanPage } from '../streamCleanPage';

export interface OcrState {
  geminiText: string;
  replicateText: string;
  isGeminiProcessing: boolean;
  isReplicateProcessing: boolean;
  error: string | null;
}

export function useOcrProcessing(pdfId: Id<'pdfs'>) {
  const [state, setState] = useState<OcrState>({
    geminiText: 'جاري تحليل المستند...',  // Start with loading message
    replicateText: 'جاري تحليل المستند...', // Start with loading message
    isGeminiProcessing: true,  // Assume processing from the beginning
    isReplicateProcessing: true, // Assume processing from the beginning
    error: null
  });

  // Track if we've already started streaming
  const geminiStreamStarted = useRef(false);
  const replicateStreamStarted = useRef(false);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Fetch page and OCR statuses - prioritize first page results
  const pages = useQuery(api.pdf.queries.getPdfPages, { pdfId });
  const firstPageId = pages?.[0]?._id;
  
  // Get first page OCR status
  const firstPageGeminiStatus = useQuery(
    api.ocr.gemini.queries.getPageOcrResults,
    firstPageId ? { pageId: firstPageId } : "skip"
  );
  
  const firstPageReplicateStatus = useQuery(
    api.ocr.replicate.queries.getPageOcrResults,
    firstPageId ? { pageId: firstPageId } : "skip"
  );
  
  // Get first page cleaned results
  const firstPageGeminiCleaned = useQuery(
    api.ocr.openai.queries.getPageCleanedResults,
    firstPageId ? { pageId: firstPageId, source: 'gemini' } : "skip"
  );
  
  const firstPageReplicateCleaned = useQuery(
    api.ocr.openai.queries.getPageCleanedResults,
    firstPageId ? { pageId: firstPageId, source: 'replicate' } : "skip"
  );
  
  // Start streaming OCR results as soon as possible
  useEffect(() => {
    // Don't start if already started or if component unmounted
    if (geminiStreamStarted.current || !isMounted.current || !firstPageId) return;
    
    // Start streaming if first page OCR is completed
    const canStartGemini = (firstPageGeminiStatus?.ocrResults?.ocrStatus === 'completed');
    
    if (canStartGemini) {
      geminiStreamStarted.current = true;
      setState(prev => ({ ...prev, isGeminiProcessing: true }));
      
      // Check if cleaned results already exist first
      if (firstPageGeminiCleaned?.cleanedText) {
        setState(prev => ({ 
          ...prev, 
          geminiText: firstPageGeminiCleaned.cleanedText,
          isGeminiProcessing: false 
        }));
      } else {
        // Stream clean the results immediately using streamCleanPage
        streamCleanPage(
          firstPageId,
          'gemini', 
          chunk => {
            if (isMounted.current) {
              setState(prev => ({ ...prev, geminiText: chunk }));
            }
          }
        )
        .catch(error => {
          console.error('Error streaming Gemini page cleanup:', error);
          if (isMounted.current) {
            setState(prev => ({ 
              ...prev, 
              error: `Failed to process Gemini page OCR: ${error.message}`,
              isGeminiProcessing: false 
            }));
          }
        })
        .finally(() => {
          if (isMounted.current) {
            setState(prev => ({ ...prev, isGeminiProcessing: false }));
          }
        });
      }
    }
  }, [firstPageGeminiStatus, firstPageGeminiCleaned, firstPageId]);

  // Replicate processing - similar approach
  useEffect(() => {
    if (replicateStreamStarted.current || !isMounted.current || !firstPageId) return;
    
    // Start streaming if first page OCR is completed
    const canStartReplicate = (firstPageReplicateStatus?.ocrResults?.ocrStatus === 'completed');
    
    if (canStartReplicate) {
      replicateStreamStarted.current = true;
      setState(prev => ({ ...prev, isReplicateProcessing: true }));
      
      // Check if cleaned results already exist first
      if (firstPageReplicateCleaned?.cleanedText) {
        setState(prev => ({ 
          ...prev, 
          replicateText: firstPageReplicateCleaned.cleanedText,
          isReplicateProcessing: false 
        }));
      } else {
        // Stream clean the results immediately using streamCleanPage
        streamCleanPage(
          firstPageId,
          'replicate', 
          chunk => {
            if (isMounted.current) {
              setState(prev => ({ ...prev, replicateText: chunk }));
            }
          }
        )
        .catch(error => {
          console.error('Error streaming Replicate page cleanup:', error);
          if (isMounted.current) {
            setState(prev => ({ 
              ...prev, 
              error: `Failed to process Replicate page OCR: ${error.message}`,
              isReplicateProcessing: false 
            }));
          }
        })
        .finally(() => {
          if (isMounted.current) {
            setState(prev => ({ ...prev, isReplicateProcessing: false }));
          }
        });
      }
    }
  }, [firstPageReplicateStatus, firstPageReplicateCleaned, firstPageId]);

  return {
    geminiText: state.geminiText,
    replicateText: state.replicateText,
    isGeminiProcessing: state.isGeminiProcessing,
    isReplicateProcessing: state.isReplicateProcessing,
    error: state.error
  };
}