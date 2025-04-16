/**
 * Count the number of pages in a PDF file using regex
 */
export const countPdfPages = (
  file: File,
  setIsLoading: (isLoading: boolean) => void
): Promise<number> => {
  return new Promise((resolve, reject) => {
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(content);
        let text = "";
        
        // Convert binary data to string
        for (let i = 0; i < bytes.length; i++) {
          text += String.fromCharCode(bytes[i]);
        }
        
        // Use regex to find page count patterns
        // This is a simple approach and may not work for all PDFs
        const pageCountRegex = /\/Count\s+(\d+)/;
        const match = text.match(pageCountRegex);
        
        if (match && match[1]) {
          const count = parseInt(match[1], 10);
          setIsLoading(false);
          resolve(count);
        } else {
          setIsLoading(false);
          console.warn("Could not determine page count");
          resolve(0);
        }
      } catch (error) {
        setIsLoading(false);
        console.error("Error counting PDF pages:", error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      setIsLoading(false);
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
}; 