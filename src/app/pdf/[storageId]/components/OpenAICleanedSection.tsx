import React from 'react'

interface OpenAICleanedProps {
  cleanedResult: {
    processedAt?: number;
    openaiModel?: string;
    cleanedText?: string;
    originalSource?: string;
  } | null;
  editedText: string;
  handleTextChange: (text: string) => void;
  sourceType: string;
}

const OpenAICleanedSection = ({ 
  cleanedResult, 
  editedText, 
  // Accept but don't use these props
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleTextChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sourceType 
}: OpenAICleanedProps) => {
  if (!cleanedResult) return null;
  
  // Ensure we have content to display
  const textToDisplay = editedText || cleanedResult.cleanedText || '';
  
  return (
    <div className="bg-emerald-950/70 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg">
      {/* <h3 className="text-xl font-medium text-white mb-2 text-right">نموذج مغلق المصدر (لا يمكن استضافته داخل الوزارة)</h3> */}
      {/* <div className="text-sm text-white/70 mb-2">
        Original Source: {sourceType} | 
        Processed: {formatTimestamp(cleanedResult.processedAt)} | 
        Model: {cleanedResult.openaiModel}
      </div> */}
      
      {/* Display the text content in a pre-formatted, scrollable container with RTL support */}
      <div 
        className="prose max-w-full text-black bg-white/90 p-3 rounded-lg border border-emerald-800/20 min-h-[200px] max-h-[300px] overflow-y-auto shadow-inner"
        dir="rtl"
      >
        <pre className="whitespace-pre-wrap text-right font-sans text-base">{textToDisplay}</pre>
      </div>
    </div>
  )
}

export default OpenAICleanedSection 