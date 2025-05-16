// Type declarations for PDF.js
declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: {
    workerSrc: any;
  };

  export function getDocument(params: { data: Uint8Array }): { 
    promise: Promise<PDFDocumentProxy> 
  };

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<any>;
  }
}

declare module 'pdfjs-dist/build/pdf.worker.entry' {
  const worker: any;
  export default worker;
}