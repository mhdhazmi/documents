import React from 'react'
import MDXEditorWrapper from './MDXEditorWrapper'
import { formatTimestamp } from '../utils/formatUtils'

interface GeminiOCRProps {
  geminiResults: {
    ocrResults?: {
      processedAt?: number;
      confidenceScore?: number;
      extractedText?: string;
    }
  } | null | undefined;
  editedGeminiText: string;
  handleGeminiTextChange: (text: string) => void;
}

const GeminiOCRSection = ({ 
  geminiResults, 
  editedGeminiText, 
  handleGeminiTextChange 
}: GeminiOCRProps) => {
  return (
    <div className="bg-blue-100 p-4 rounded-lg mb-2">
      {/* <h3 className="text-xl font-medium text-blue-800 mb-2">Gemini OCR</h3> */}
      {geminiResults?.ocrResults ? (
        <div>
          <div className="text-sm text-gray-600 mb-2">
            Processed: {formatTimestamp(geminiResults.ocrResults.processedAt)}
          </div>
          <MDXEditorWrapper 
            markdown={editedGeminiText} 
            onChange={handleGeminiTextChange} 
          />
        </div>
      ) : (
        <div className="text-black italic">يتم الآن معالجة النصوص</div>
      )}
    </div>
  )
}

export default GeminiOCRSection 