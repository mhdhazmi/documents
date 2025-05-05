import React from 'react'

interface OCRfileProps {
  textToDisplay: string;
  closed: boolean;
  isProcessing?: boolean;
  hide?: boolean;
}

export default function OCRfile({ 
  textToDisplay, 
  closed, 
  isProcessing = false,
  hide = false
}: OCRfileProps) {
  const modelLabel = closed ? 
    'نموذج مغلق المصدر (لا يمكن استضافته داخل الوزارة)' : 
    'نموذج مفتوح المصدر (يمكن استضافته داخل الوزارة)';
    
  return (
    <div className="bg-emerald-950/70 backdrop-blur-md p-3 md:p-4 rounded-lg border border-white/20 shadow-lg">
      <div className="flex flex-col w-full overflow-y-auto">
        <h3 className="text-base md:text-lg font-medium mb-2 text-white text-right">
          {modelLabel}
        </h3>
        
        <div className="relative">
          {/* Only show content if not hidden */}
          {!hide ? (
            <div 
              className="prose max-w-full text-black bg-white/90 p-3 rounded-lg border border-emerald-800/20 min-h-[150px] md:min-h-[200px] max-h-[200px] md:max-h-[300px] overflow-y-auto shadow-inner relative animate-in fade-in duration-500"
              dir="rtl"
            >
              {isProcessing && (
                <div className="absolute top-0 right-0 bg-emerald-700/20 text-white px-2 py-1 text-xs rounded-bl-lg">
                  جاري المعالجة...
                </div>
              )}
              <pre className="whitespace-pre-wrap text-right font-sans text-sm md:text-base">{textToDisplay}</pre>
            </div>
          ) : (
            <div 
              className="prose max-w-full bg-white/5 backdrop-blur-md p-3 rounded-lg border border-emerald-800/10 min-h-[50px] md:min-h-[80px] shadow-inner relative flex items-center justify-center"
            >
              <span className="text-white/60 text-sm">جاري تحليل المستند...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}