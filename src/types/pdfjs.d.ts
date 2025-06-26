// Type declarations for PDF.js
declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: {
    workerSrc: unknown;
  };

  export function getDocument(params: { data: Uint8Array }): {
    promise: Promise<PDFDocumentProxy>;
  };

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<unknown>;
  }
}

  declare module 'pdfjs-dist/build/pdf.worker.entry' {
    const worker: unknown;
    export default worker;
  }
