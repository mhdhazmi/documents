import { useQuery } from 'convex/react'
import React, { useState, useEffect } from 'react'
import { api } from '../../../../convex/_generated/api'
import { PDFId, GeminiOCRResult, ReplicateOCRResult, OpenAIResults, OpenAICleanedResult } from './types'
import OpenAICleanedSection from './components/OpenAICleanedSection'

interface OCRfileProps {
  OCRid: string
}

// Loading placeholder for OCR sections
const OCRSectionLoading = ({ title }: { title: string }) => (
  <div className="mb-6">
    <h3 className="text-lg font-medium mb-2 text-white">{title}</h3>
    <div className="w-full h-32 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 animate-pulse flex items-center justify-center">
      <p className="text-white/70">Loading results...</p>
    </div>
  </div>
);

function OCRfile({ OCRid }: OCRfileProps) {
  // Query Gemini OCR results
  const geminiResults = useQuery(api.ocr.gemini.queries.getOcrResults, { 
    pdfId: OCRid as PDFId 
  }) as GeminiOCRResult | null | undefined

  // Query Replicate OCR results
  const replicateResults = useQuery(api.ocr.replicate.queries.getOcrResults, { 
    pdfId: OCRid as PDFId 
  }) as ReplicateOCRResult | null | undefined

  // Query OpenAI cleaned results
  const openaiResults = useQuery(api.ocr.openai.queries.getCleanedResults, {
    pdfId: OCRid as PDFId
  }) as OpenAIResults | null | undefined
  
  // State for edited content
  const [editedGeminiCleaned, setEditedGeminiCleaned] = useState<string>("");
  const [editedReplicateCleaned, setEditedReplicateCleaned] = useState<string>("");
  
  // Track if user has edited content
  const [hasEdited, setHasEdited] = useState({
    gemini: false,
    replicate: false,
    geminiCleaned: false,
    replicateCleaned: false
  });

  // Initialize edit states when results are loaded
  useEffect(() => {
    if (geminiResults?.ocrResults?.extractedText && !hasEdited.gemini) {
      // We're not using this state anymore, but keeping the effect for future use
    }
    if (replicateResults?.ocrResults?.extractedText && !hasEdited.replicate) {
      // We're not using this state anymore, but keeping the effect for future use
    }
  }, [geminiResults, replicateResults, hasEdited]);

  // Find the OpenAI cleaned version for a specific source
  const getCleanedResultForSource = (source: "gemini" | "replicate"): OpenAICleanedResult | null => {
    if (!openaiResults?.ocrResults || !openaiResults.ocrResults.length) return null;
    return openaiResults.ocrResults.find(result => 
      result.originalSource && result.originalSource.toLowerCase() === source.toLowerCase()
    ) || null;
  }

  const geminiCleaned = getCleanedResultForSource("gemini");
  const replicateCleaned = getCleanedResultForSource("replicate");
  
  // Initialize cleaned text states when results are loaded
  useEffect(() => {
    if (geminiCleaned?.cleanedText && !hasEdited.geminiCleaned) {
      setEditedGeminiCleaned(geminiCleaned.cleanedText);
    }
    if (replicateCleaned?.cleanedText && !hasEdited.replicateCleaned) {
      setEditedReplicateCleaned(replicateCleaned.cleanedText);
    }
  }, [geminiCleaned, replicateCleaned, hasEdited]);

  // These handlers are needed for the component props but won't be used
  const handleGeminiCleanedChange = (text: string) => {
    setEditedGeminiCleaned(text);
    setHasEdited(prev => ({ ...prev, geminiCleaned: true }));
  };

  const handleReplicateCleanedChange = (text: string) => {
    setEditedReplicateCleaned(text);
    setHasEdited(prev => ({ ...prev, replicateCleaned: true }));
  };

  // Check if any data is still loading
  const isLoading = !openaiResults || openaiResults === undefined;
  
  // Debug
  console.log("OpenAI Results:", openaiResults);
  console.log("Gemini Cleaned:", geminiCleaned);
  console.log("Replicate Cleaned:", replicateCleaned);

  return (
    <div className="flex flex-col w-full h-full max-h-[900px] overflow-y-auto pl-4 pr-2">
      <h2 className="text-2xl font-semibold mb-4 text-white text-right">نتائج التحويل إلى نصوص </h2>
      
      {/* Gemini Results */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-2 text-white text-right">نموذج مغلق المصدر (لا يمكن استضافته داخل الوزارة)</h3>
        {/* OpenAI cleaned Gemini results */}
        {isLoading ? (
          <OCRSectionLoading title="Processing..." />
        ) : geminiCleaned ? (
          <OpenAICleanedSection 
            cleanedResult={geminiCleaned}
            editedText={editedGeminiCleaned}
            handleTextChange={handleGeminiCleanedChange}
            sourceType="Gemini"
          />
        ) : (
          <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <p className="text-white/70 text-right">يتم الآن معالجة النصوص</p>
          </div>
        )}
      </div>

      {/* Replicate Results */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-2 text-white text-right">نموذج مفتوح المصدر ( يمكن استضافته داخل الوزارة)</h3>
        {/* OpenAI cleaned Replicate results */}
        {isLoading ? (
          <OCRSectionLoading title="Processing..." />
        ) : replicateCleaned ? (
          <OpenAICleanedSection 
            cleanedResult={replicateCleaned}
            editedText={editedReplicateCleaned}
            handleTextChange={handleReplicateCleanedChange}
            sourceType="Replicate"
          />
        ) : (
          <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <p className="text-white/70 text-right">يتم الآن معالجة النصوص</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default OCRfile