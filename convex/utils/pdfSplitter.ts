// convex/utils/pdfSplitter.ts
import { PDFDocument } from "pdf-lib";

export async function splitPdf(pdfBuffer: ArrayBuffer): Promise<Blob[]> {
  try {
    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    console.log(`Splitting PDF with ${pageCount} pages`);
    
    // Array to hold individual page PDFs
    const pageBlobs: Blob[] = [];
    
    // Process each page
    for (let i = 0; i < pageCount; i++) {
      // Create a new document with just this page
      const newDoc = await PDFDocument.create();
      const [page] = await newDoc.copyPages(pdfDoc, [i]);
      newDoc.addPage(page);
      
      // Convert to PDF bytes
      const pdfBytes = await newDoc.save();
      
      // Convert to Blob
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      pageBlobs.push(blob);
    }
    
    return pageBlobs;
  } catch (error) {
    console.error('Error splitting PDF:', error);
    throw new Error(`Failed to split PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}