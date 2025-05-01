import React from 'react';

export default function PDFViewer({ pdfUrl }: { pdfUrl: string }) {
  return (
    <div className="w-full md:w-1/2 p-4 h-full">
      <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-2 border border-white/20 h-full">
        {/* PDF Viewer - Empty state */}
        <div className="w-full h-full flex flex-col items-center justify-center text-white">
          <p className="text-center mb-2">اسأل سؤالاً لعرض المستند المناسب</p>
          <p className="text-center text-sm text-white/70">(Ask a question to see a relevant document)</p>
        </div>
        
        {/* Uncomment this to show PDF instead
        <iframe
          src="https://example.com/sample.pdf"
          title="PDF Viewer"
          width="100%"
          height="100%"
          style={{ border: 'none', borderRadius: '12px' }}
        />
        */}
      </div>
    </div>
  );
}