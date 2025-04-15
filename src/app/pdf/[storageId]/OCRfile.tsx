import { useQuery } from 'convex/react'
import React from 'react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'

interface OCRfileProps {
  OCRid: string
}

function OCRfile({ OCRid }: OCRfileProps) {
  // Query Gemini OCR results
  const geminiResults = useQuery(api.ocr.gemini.queries.getOcrResults, { 
    pdfId: OCRid as Id<"pdfs"> 
  })

  // Query Replicate OCR results
  const replicateResults = useQuery(api.ocr.replicate.queries.getOcrResults, { 
    pdfId: OCRid as Id<"pdfs"> 
  })

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'No timestamp'
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="flex flex-col w-full h-full max-h-[900px] overflow-y-auto pl-4 pr-2">
      <h2 className="text-2xl font-semibold mb-4">OCR Results</h2>
      
      {/* Gemini Results (Top) */}
      <div className="mb-8">
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="text-xl font-medium text-blue-800 mb-2">Gemini OCR</h3>
          {geminiResults?.ocrResults ? (
            <div>
              <div className="text-sm text-gray-600 mb-2">
                Processed: {formatTimestamp(geminiResults.ocrResults.processedAt)}
                {geminiResults.ocrResults.confidenceScore && (
                  <span className="ml-2">| Confidence: {(geminiResults.ocrResults.confidenceScore * 100).toFixed(1)}%</span>
                )}
              </div>
              <div className="whitespace-pre-wrap bg-gray-200 p-3 rounded border border-blue-200 text-sm max-h-[300px] overflow-y-auto  text-black">
                {geminiResults.ocrResults.extractedText || "No text extracted"}
              </div>
            </div>
          ) : (
            <div className="text-black italic">No Gemini OCR results available</div>
          )}
        </div>
      </div>

      {/* Replicate Results (Bottom) */}
      <div>
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="text-xl font-medium text-purple-800 mb-2">Replicate OCR</h3>
          {replicateResults?.ocrResults ? (
            <div>
              <div className="text-sm text-gray-600 mb-2">
                Processed: {formatTimestamp(replicateResults.ocrResults.processedAt)}
                <span className="ml-2">| Model: {replicateResults.ocrResults.replicateModelId}</span>
              </div>
              <div className="whitespace-pre-wrap bg-white p-3 rounded border border-purple-200 text-sm max-h-[300px] overflow-y-auto text-black">
                {replicateResults.ocrResults.extractedText || "No text extracted"}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 italic">No Replicate OCR results available</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OCRfile