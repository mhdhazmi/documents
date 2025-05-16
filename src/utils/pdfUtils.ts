/**
 * Count the number of pages in a PDF file using pdf.js
 * This is a more robust method than using regex
 */
export const countPdfPages = (
  file: File,
  setIsLoading: (isLoading: boolean) => void
): Promise<number> => {
  return new Promise((resolve) => {
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as ArrayBuffer;
        
        // Use dynamic import to load pdf.js only when needed
        const pdfjs = await import('pdfjs-dist/build/pdf');
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        
        // Set the worker source
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        
        // Use pdf.js to properly get the page count
        const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(content) }).promise;
        const pageCount = pdfDoc.numPages;
        
        // Validate the page count is reasonable
        if (pageCount > 0 && pageCount < 10000) {  // Reasonable upper limit
          setIsLoading(false);
          resolve(pageCount);
        } else {
          console.warn(`Unusual page count detected: ${pageCount}, validating...`);
          
          // Try to actually access a page to validate
          try {
            await pdfDoc.getPage(1);
            setIsLoading(false);
            resolve(pageCount);
          } catch (err) {
            console.error("Failed page access validation:", err);
            setIsLoading(false);
            resolve(1); // Default fallback
          }
        }
      } catch (error) {
        console.error("Error counting PDF pages:", error);
        setIsLoading(false);
        
        // Try fallback method with regex if pdf.js fails
        try {
          // Fallback to regex method
          const bytes = new Uint8Array(content);
          let text = "";
          
          // Convert only the first part of the PDF to text (for performance)
          // Most PDFs have the page count in the first few KB
          const maxBytes = Math.min(bytes.length, 20000);
          for (let i = 0; i < maxBytes; i++) {
            text += String.fromCharCode(bytes[i]);
          }
          
          // Use multiple regex patterns for better detection
          const patterns = [
            /\/Count\s+(\d+)/, 
            /\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/,
            /\/N\s+(\d+)/
          ];
          
          for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
              const count = parseInt(match[1], 10);
              if (count > 0 && count < 10000) { // Validate count is reasonable
                console.log("Used fallback regex method to determine page count:", count);
                resolve(count);
                return;
              }
            }
          }
          
          // If all patterns fail, estimate based on file size
          // Average PDF page is roughly 100KB
          const estimatedCount = Math.max(1, Math.ceil(file.size / 100000));
          console.warn("Could not determine page count, estimating based on file size:", estimatedCount);
          resolve(Math.min(estimatedCount, 100)); // Cap at 100 pages for safety
          
        } catch (fallbackError) {
          console.error("Fallback page counting also failed:", fallbackError);
          resolve(1);
        }
      }
    };
    
    reader.onerror = (error) => {
      setIsLoading(false);
      console.error("Error reading PDF file:", error);
      resolve(1);
    };
    
    reader.readAsArrayBuffer(file);
  });
}; 