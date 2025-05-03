import { OCRResult } from '../../../../convex/ocrSchema';

export async function streamClean(
  jobId: string, 
  src: "gemini" | "replicate", 
  onChunk: (result: OCRResult) => void
) {
  const resp = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL_HTTP}/clean`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Origin": window.location.origin
    },
    body: JSON.stringify({ pdfId: jobId, source: src }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    console.error("Error from clean endpoint:", errorText);
    throw new Error(`Error from server: ${resp.status} - ${errorText}`);
  }

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let currentResult: OCRResult = {
    arabic: "",
    english: "",
    keywordsArabic: [],
    keywordsEnglish: []
  };
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Try to parse JSON from the accumulated buffer
    try {
      if (buffer.includes('{') && buffer.includes('}')) {
        // Try to extract a complete JSON object
        const startPos = buffer.indexOf('{');
        const endPos = buffer.lastIndexOf('}') + 1;
        const jsonStr = buffer.substring(startPos, endPos);
        
        try {
          const parsed = JSON.parse(jsonStr);
          
          // Extract fields from parsed JSON
          if (parsed.arabic) {
            currentResult.arabic = parsed.arabic;
          }
          if (parsed.english) {
            currentResult.english = parsed.english;
          }
          if (parsed.keywordsArabic && Array.isArray(parsed.keywordsArabic)) {
            currentResult.keywordsArabic = parsed.keywordsArabic;
          }
          if (parsed.keywordsEnglish && Array.isArray(parsed.keywordsEnglish)) {
            currentResult.keywordsEnglish = parsed.keywordsEnglish;
          }
          
          onChunk(currentResult);
        } catch (e) {
          // JSON parsing failed, use the buffer as Arabic text for now
          currentResult.arabic = buffer;
          onChunk(currentResult);
        }
      } else {
        // No complete JSON object found, use buffer as Arabic text
        currentResult.arabic = buffer;
        onChunk(currentResult);
      }
    } catch (e) {
      // Fallback: use buffer as Arabic text
      currentResult.arabic = buffer;
      onChunk(currentResult);
    }
  }
  
  // Final callback with complete result
  onChunk(currentResult);
}