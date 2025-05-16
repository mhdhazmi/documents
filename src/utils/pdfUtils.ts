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
      const content = e.target?.result as ArrayBuffer;
      
      // First try using PDF.js (preferred approach)
      const countUsingPdfJs = async (): Promise<number> => {
        try {
          // @ts-ignore - Ignore TypeScript errors for pdf.js imports
          const pdfjs = await import('pdfjs-dist/build/pdf');
          // @ts-ignore - Ignore TypeScript errors for pdf.js imports
          const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
          
          // Set the worker source
          pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
          
          // Use pdf.js to properly get the page count
          const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(content) }).promise;
          const pageCount = pdfDoc.numPages;
          
          // Validate the page count is reasonable
          if (pageCount > 0 && pageCount < 10000) {  // Reasonable upper limit
            return pageCount;
          } else {
            console.warn(`Unusual page count detected: ${pageCount}, validating...`);
            
            // Try to actually access a page to validate
            try {
              await pdfDoc.getPage(1);
              return pageCount;
            } catch (err) {
              console.error("Failed page access validation:", err);
              throw new Error("Failed page validation");
            }
          }
        } catch (error) {
          console.error("Error using PDF.js:", error);
          throw error;
        }
      };
      
      // Fallback method using regex
      const countUsingRegex = (): number => {
        try {
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
                return count;
              }
            }
          }
          
          throw new Error("No valid page count found using regex");
        } catch (error) {
          console.error("Error using regex fallback:", error);
          throw error;
        }
      };
      
      // Estimate based on file size as last resort
      const estimateFromFileSize = (): number => {
        try {
          const estimatedCount = Math.max(1, Math.ceil(file.size / 100000));
          console.warn("Could not determine page count, estimating based on file size:", estimatedCount);
          return Math.min(estimatedCount, 100); // Cap at 100 pages for safety
        } catch (error) {
          console.error("Error estimating from file size:", error);
          return 1;
        }
      };
      
      // Try each method in order, falling back to the next if one fails
      try {
        const pageCount = await countUsingPdfJs();
        setIsLoading(false);
        resolve(pageCount);
      } catch (error) {
        try {
          const pageCount = countUsingRegex();
          setIsLoading(false);
          resolve(pageCount);
        } catch (regexError) {
          const pageCount = estimateFromFileSize();
          setIsLoading(false);
          resolve(pageCount);
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