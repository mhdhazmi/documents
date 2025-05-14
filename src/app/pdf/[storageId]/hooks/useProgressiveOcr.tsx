// src/app/pdf/[storageId]/hooks/useProgressiveOcr.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

export interface ProgressiveOcrState {
  geminiText: string;
  replicateText: string;
  isGeminiProcessing: boolean;
  isReplicateProcessing: boolean;
  completionPercentage: number;
  error: string | null;
}

/**
 * Custom hook that provides progressive OCR results, prioritizing first page
 * This hook attempts to show results as soon as possible by:
 * 1. First checking if the first page OCR is completed
 * 2. Using the streaming API to show results as they come in
 * 3. Providing progress indicators for the overall OCR process
 */
export function useProgressiveOcr(pdfId: Id<'pdfs'>) {
  const [state, setState] = useState<ProgressiveOcrState>({
    geminiText: 'جاري تحليل المستند...',
    replicateText: 'جاري تحليل المستند...',
    isGeminiProcessing: true,
    isReplicateProcessing: true,
    completionPercentage: 0,
    error: null
  });

  // Track first page streaming status to avoid duplicate streams
  const geminiFirstPageStreamed = useRef(false);
  const replicateFirstPageStreamed = useRef(false);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Add cleanup function
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Fetch PDF info including page count
  const pdfInfo = useQuery(api.pdf.queries.getPdf, { pdfId });
  const totalPages = pdfInfo?.pageCount || 0;
  
  // Fetch all pages to check their status
  const pages = useQuery(api.pdf.queries.getPdfPages, { pdfId });
  const firstPageId = pages?.[0]?._id;
  
  // Get first page OCR results (priority processing)
  const firstPageGeminiResults = useQuery(
    api.ocr.gemini.queries.getPageOcrResults,
    firstPageId ? { pageId: firstPageId } : "skip"
  );
  
  const firstPageReplicateResults = useQuery(
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
  
  // Full document OCR status - removed - legacy PDF-level OCR APIs no longer exist
  // Now we rely entirely on page-level processing
  
  // Calculate overall completion percentage based on first page status only
  useEffect(() => {
    if (!totalPages || totalPages === 0) return;
    
    // Determine completion percentage based on first page status
    const geminiCompleted = firstPageGeminiResults?.ocrResults?.ocrStatus === 'completed';
    const replicateCompleted = firstPageReplicateResults?.ocrResults?.ocrStatus === 'completed';
    
    // If both first pages are complete, we consider it significant progress
    if (geminiCompleted && replicateCompleted) {
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          completionPercentage: 80
        }));
      }
      return;
    }
    
    // Calculate progress based on individual provider status
    let estimatedProgress = 0;
    
    if (geminiCompleted) {
      estimatedProgress += 40; // First page complete is significant progress
    }
    
    if (replicateCompleted) {
      estimatedProgress += 40; // First page complete is significant progress
    }
    
    // If streaming has started, add a bit more progress
    if (geminiFirstPageStreamed.current || replicateFirstPageStreamed.current) {
      estimatedProgress += 10;
    }
    
    if (isMounted.current) {
      setState(prev => ({
        ...prev,
        completionPercentage: Math.min(95, estimatedProgress) // Cap at 95% until actually complete
      }));
    }
  }, [
    totalPages, 
    firstPageGeminiResults, 
    firstPageReplicateResults
  ]);
  
  // Function to stream first page OCR results - wrap in useCallback to avoid regenerating on every render
  const streamFirstPageResults = useCallback(async (source: 'gemini' | 'replicate') => {
    if (!pdfId || !firstPageId) return;
    
    // Get reference to the appropriate streaming flag
    const streamRef = source === 'gemini' ? geminiFirstPageStreamed : replicateFirstPageStreamed;
    
    // If already streaming, don't start another stream
    if (streamRef.current) return;
    streamRef.current = true;
    
    try {
      // Update state to show processing
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          ...(source === 'gemini' 
            ? { isGeminiProcessing: true } 
            : { isReplicateProcessing: true }),
        }));
      }
      
      // Fetch the first page results
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || '';
      const response = await fetch(
        `${convexUrl.replace("convex.cloud", "convex.site")}/firstPage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify({
            pdfId,
            source
          })
        }
      );
      
      // If the server indicates processing, retry after a delay
      if (response.status === 202) {
        setTimeout(() => {
          streamRef.current = false; // Reset flag to allow retry
          streamFirstPageResults(source);
        }, 3000);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('Response body is null');
      }
      
      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        
        // Update the state with the new text
        if (isMounted.current) {
          setState(prev => ({
            ...prev,
            ...(source === 'gemini' 
              ? { geminiText: fullText } 
              : { replicateText: fullText }),
          }));
        }
      }
      
      // Ensure the final chunk is processed
      const finalChunk = decoder.decode();
      if (finalChunk) {
        fullText += finalChunk;
      }
      
      // Final update
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          ...(source === 'gemini' 
            ? { geminiText: fullText, isGeminiProcessing: false } 
            : { replicateText: fullText, isReplicateProcessing: false }),
        }));
      }
      
    } catch (err) {
      const error = err as Error;
      console.error(`Error streaming ${source} first page results:`, error);
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          error: `Failed to process ${source} first page OCR: ${error.message || 'Unknown error'}`,
          ...(source === 'gemini' 
            ? { isGeminiProcessing: false } 
            : { isReplicateProcessing: false }),
        }));
      }
    }
  }, [pdfId, firstPageId]);
  
  // Legacy streamFullDocument function has been removed since the /clean endpoint no longer exists
  
  // Start Gemini processing with progressive strategy
  useEffect(() => {
    // Don't proceed if component is unmounted or not all data is available
    if (!isMounted.current || !pdfId) return;
    
    // If already processed, show the results immediately
    if (firstPageGeminiCleaned?.cleanedText) {
      setState(prev => ({
        ...prev,
        geminiText: firstPageGeminiCleaned.cleanedText,
        isGeminiProcessing: false,
      }));
    } 
    // First check if first page OCR is complete and start streaming
    else if (firstPageGeminiResults?.ocrResults?.ocrStatus === 'completed' && !geminiFirstPageStreamed.current) {
      streamFirstPageResults('gemini');
    }
  }, [
    pdfId, 
    firstPageGeminiResults, 
    firstPageGeminiCleaned,
    streamFirstPageResults
  ]);
  
  // Start Replicate processing with progressive strategy (similar approach)
  useEffect(() => {
    // Don't proceed if component is unmounted or not all data is available
    if (!isMounted.current || !pdfId) return;
    
    // If already processed, show the results immediately
    if (firstPageReplicateCleaned?.cleanedText) {
      setState(prev => ({
        ...prev,
        replicateText: firstPageReplicateCleaned.cleanedText,
        isReplicateProcessing: false,
      }));
    } 
    // First check if first page OCR is complete
    else if (firstPageReplicateResults?.ocrResults?.ocrStatus === 'completed' && !replicateFirstPageStreamed.current) {
      streamFirstPageResults('replicate');
    }
  }, [
    pdfId, 
    firstPageReplicateResults, 
    firstPageReplicateCleaned,
    streamFirstPageResults
  ]);
  
  return {
    geminiText: state.geminiText,
    replicateText: state.replicateText,
    isGeminiProcessing: state.isGeminiProcessing,
    isReplicateProcessing: state.isReplicateProcessing,
    completionPercentage: state.completionPercentage,
    error: state.error
  };
}