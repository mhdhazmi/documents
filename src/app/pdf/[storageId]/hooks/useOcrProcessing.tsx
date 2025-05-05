// First, let's create a custom hook for OCR processing

// src/app/pdf/[storageId]/hooks/useOcrProcessing.ts
import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { streamClean } from '../streamClean';

export interface OcrState {
  geminiText: string;
  replicateText: string;
  isGeminiProcessing: boolean;
  isReplicateProcessing: boolean;
  error: string | null;
}

export function useOcrProcessing(pdfId: Id<'pdfs'>) {
  const [state, setState] = useState<OcrState>({
    geminiText: '',
    replicateText: '',
    isGeminiProcessing: false,
    isReplicateProcessing: false,
    error: null
  });

  // Fetch OCR results for Gemini and Replicate
  const geminiJobStatus = useQuery(api.ocr.gemini.queries.getOcrByPdfId, { pdfId });
  const replicateJobStatus = useQuery(api.ocr.replicate.queries.getOcrByPdfId, { pdfId });
  
  // Fetch cleaned results if they exist
  const openaiGeminiResults = useQuery(api.ocr.openai.queries.getCleanedId, { 
    pdfId, 
    source: 'gemini' 
  });
  const openaiReplicateResults = useQuery(api.ocr.openai.queries.getCleanedId, { 
    pdfId, 
    source: 'replicate' 
  });

  // Process Gemini results
  useEffect(() => {
    // Only run once when status changes to completed and text is empty
    if (geminiJobStatus?.[0]?.ocrStatus === 'completed' && !state.geminiText && !state.isGeminiProcessing) {
      setState(prev => ({ ...prev, isGeminiProcessing: true }));
      
      // Check if cleaned results already exist
      if (openaiGeminiResults?.[0]?.cleaningStatus === 'completed') {
        setState(prev => ({ 
          ...prev, 
          geminiText: openaiGeminiResults[0].cleanedText,
          isGeminiProcessing: false 
        }));
      } else {
        // Stream clean the results
        streamClean(
          pdfId as string, 
          'gemini', 
          chunk => setState(prev => ({ ...prev, geminiText: chunk }))
        )
        .catch(error => {
          console.error('Error streaming Gemini cleanup:', error);
          setState(prev => ({ 
            ...prev, 
            error: `Failed to process Gemini OCR: ${error.message}`,
            isGeminiProcessing: false 
          }));
        })
        .finally(() => {
          setState(prev => ({ ...prev, isGeminiProcessing: false }));
        });
      }
    }
  }, [geminiJobStatus, openaiGeminiResults, pdfId, state.geminiText, state.isGeminiProcessing]);

  // Process Replicate results (same pattern)
  useEffect(() => {
    if (replicateJobStatus?.[0]?.ocrStatus === 'completed' && !state.replicateText && !state.isReplicateProcessing) {
      setState(prev => ({ ...prev, isReplicateProcessing: true }));
      
      if (openaiReplicateResults?.[0]?.cleaningStatus === 'completed') {
        setState(prev => ({ 
          ...prev, 
          replicateText: openaiReplicateResults[0].cleanedText,
          isReplicateProcessing: false 
        }));
      } else {
        streamClean(
          pdfId as string, 
          'replicate', 
          chunk => setState(prev => ({ ...prev, replicateText: chunk }))
        )
        .catch(error => {
          console.error('Error streaming Replicate cleanup:', error);
          setState(prev => ({ 
            ...prev, 
            error: `Failed to process Replicate OCR: ${error.message}`,
            isReplicateProcessing: false 
          }));
        })
        .finally(() => {
          setState(prev => ({ ...prev, isReplicateProcessing: false }));
        });
      }
    }
  }, [replicateJobStatus, openaiReplicateResults, pdfId, state.replicateText, state.isReplicateProcessing]);

  return {
    geminiText: state.geminiText || 'يتم الآن تحليل الملف وتحويله إلى نص',
    replicateText: state.replicateText || 'يتم الآن تحليل الملف وتحويله إلى نص',
    isGeminiProcessing: state.isGeminiProcessing,
    isReplicateProcessing: state.isReplicateProcessing,
    error: state.error
  };
}