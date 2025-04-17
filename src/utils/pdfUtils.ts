/**
 * Count the number of pages in a PDF file using regex
 */
export const countPdfPages = (
  file: File,
  setIsLoading: (isLoading: boolean) => void
): Promise<number> => {
  return new Promise((resolve) => {
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
        const pageCountRegex = /\/Count\s+(\d+)/;
        const match = text.match(pageCountRegex);
        setIsLoading(false);
        if (match && match[1]) {
          const count = parseInt(match[1], 10);
          resolve(count);
        } else {
          console.warn("Could not determine page count, defaulting to 1 page");
          resolve(1);
        }
      } catch (error) {
        setIsLoading(false);
        console.error("Error counting PDF pages:", error);
        resolve(1);
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