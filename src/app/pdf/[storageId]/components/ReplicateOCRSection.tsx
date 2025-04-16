import React from 'react'
import MDXEditorWrapper from './MDXEditorWrapper'
import { formatTimestamp } from '../utils/formatUtils'

interface ReplicateOCRProps {
  replicateResults: {
    ocrResults?: {
      processedAt?: number;
      replicateModelId?: string;
      extractedText?: string;
    }
  } | null | undefined;
  editedReplicateText: string;
  handleReplicateTextChange: (text: string) => void;
}

const ReplicateOCRSection = ({ 
  replicateResults, 
  editedReplicateText, 
  handleReplicateTextChange 
}: ReplicateOCRProps) => {
  return (
    <div className="bg-purple-100 p-4 rounded-lg mb-2">
      <h3 className="text-xl font-medium text-purple-800 mb-2">Replicate OCR</h3>
      {replicateResults?.ocrResults ? (
        <div>
          <div className="text-sm text-gray-600 mb-2">
            Processed: {formatTimestamp(replicateResults.ocrResults.processedAt)}
            <span className="ml-2">| Model: {replicateResults.ocrResults.replicateModelId}</span>
          </div>
          <MDXEditorWrapper 
            markdown={editedReplicateText} 
            onChange={handleReplicateTextChange} 
          />
        </div>
      ) : (
        <div className="text-gray-500 italic">يتم الآن معالجة النصوص</div>
      )}
    </div>
  )
}

export default ReplicateOCRSection 