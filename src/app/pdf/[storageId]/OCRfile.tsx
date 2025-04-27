import React from 'react'

export default function ocrPreviewSection({textToDisplay, closed}: {textToDisplay: string, closed: boolean}) {
  return (

    <div className="my-6">
      <div className="bg-emerald-950/70 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg">
      <div className="flex flex-col w-full h-full max-h-[900px] overflow-y-auto pl-4 pr-2">
      <h2 className="text-2xl font-semibold mb-4 text-white text-right">نتائج التحويل إلى نصوص </h2>
      
      
      {closed ? <h3 className="text-lg font-medium mb-2 text-white text-right">نموذج مغلق المصدر (لا يمكن استضافته داخل الوزارة)</h3>
      :<h3 className="text-lg font-medium mb-2 text-white text-right">نموذج مفتوح المصدر ( يمكن استضافته داخل الوزارة)</h3>}

      <div 
        className="prose max-w-full text-black bg-white/90 p-3 rounded-lg border border-emerald-800/20 min-h-[200px] max-h-[300px] overflow-y-auto shadow-inner"
        dir="rtl"
      >
        <pre className="whitespace-pre-wrap text-right font-sans text-base">{textToDisplay}</pre>
        </div>
      </div>
    
    </div>
    </div>
  )
}


  
