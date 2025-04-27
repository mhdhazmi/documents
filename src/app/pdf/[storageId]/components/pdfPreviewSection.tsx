import React from 'react'

export default function PdfPreviewSection({pdfUrl}: {pdfUrl: string | null}) {
  return (
    <div className="w-1/2 pr-2">
    {pdfUrl ? (
        <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-2 border border-white/20">
            <iframe
                src={pdfUrl}
                title="PDF Viewer"
                width="100%"
                height="900px"
                style={{ border: 'none', borderRadius: '12px' }}
            />
        </div>
    ) : (
        <div className="w-full h-[900px] flex items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
            Loading PDF...
        </div>
    )}
</div>
    
  )
}

