import React from 'react'

export default function PdfPreviewSection({pdfUrl}: {pdfUrl: string | null}) {
  return (
    <div className="w-full h-full">
    {pdfUrl ? (
        <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-2 border border-white/20">
            <iframe
                src={pdfUrl}
                title="PDF Viewer"
                width="100%"
                height="500px"
                className="max-h-[900px] h-[50vh] md:h-[900px]"
                style={{ border: 'none', borderRadius: '12px' }}
            />
        </div>
    ) : (
        <div className="w-full h-[50vh] md:h-[900px] max-h-[900px] flex items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
            Loading PDF...
        </div>
    )}
</div>
    
  )
}

