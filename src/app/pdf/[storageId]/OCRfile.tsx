import React from 'react'

interface OCRfileProps {
  textToDisplay: string;
  closed: boolean;
  isProcessing?: boolean;
}

export default function OCRfile({ textToDisplay, closed, isProcessing = false }: OCRfileProps) {
  return (
    <div className="my-3 md:my-6">
      <div className="bg-emerald-950/70 backdrop-blur-md p-3 md:p-4 rounded-xl border border-white/20 shadow-lg">
        <div className="flex flex-col w-full h-full overflow-y-auto px-2 md:px-4">
          <h2 className="text-xl md:text-2xl font-semibold mb-2 md:mb-4 text-white text-right">نتائج التحويل إلى نصوص</h2>
          
          {closed ? 
            <h3 className="text-base md:text-lg font-medium mb-2 text-white text-right">نموذج مغلق المصدر (لا يمكن استضافته داخل الوزارة)</h3>
            :
            <h3 className="text-base md:text-lg font-medium mb-2 text-white text-right">نموذج مفتوح المصدر (يمكن استضافته داخل الوزارة)</h3>
          }

          <div 
            className="prose max-w-full text-black bg-white/90 p-3 rounded-lg border border-emerald-800/20 min-h-[150px] md:min-h-[200px] max-h-[200px] md:max-h-[300px] overflow-y-auto shadow-inner relative"
            dir="rtl"
          >
            {isProcessing && (
              <div className="absolute top-0 left-0 bg-emerald-700/20 text-white px-2 py-1 text-xs rounded-br-lg">
                جاري المعالجة...
              </div>
            )}
            <pre className="whitespace-pre-wrap text-right font-sans text-sm md:text-base">{textToDisplay}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}