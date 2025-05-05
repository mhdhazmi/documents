export async function streamClean(
  jobId: string, 
  src: "gemini" | "replicate", 
  onChunk: (c: string) => void,
  onError?: (error: Error) => void
): Promise<void> {
  console.log(`Starting stream cleaning for ${src} OCR of PDF ${jobId}`);
  
  try {
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
      console.error(`Error from clean endpoint (${resp.status}):`, errorText);
      throw new Error(`Server error: ${resp.status} - ${errorText}`);
    }

    if (!resp.body) {
      throw new Error('Response body is null');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    let lastUpdateTime = 0;
    
    // Start with an empty update to indicate streaming has begun
    onChunk("");
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const newChunk = decoder.decode(value, { stream: true });
      fullText += newChunk;
      
      // Throttle updates to reduce UI jitter (every 100ms)
      const now = Date.now();
      if (now - lastUpdateTime > 100) {
        onChunk(fullText);
        lastUpdateTime = now;
      }
    }
    
    // Ensure final text is processed with any remaining decoder content
    const finalChunk = decoder.decode();
    if (finalChunk) {
      fullText += finalChunk;
    }
    
    // Final update
    onChunk(fullText);
    console.log(`Completed stream cleaning for ${src} OCR of PDF ${jobId}`);
  } catch (error) {
    console.error(`Stream clean error for ${src} OCR of PDF ${jobId}:`, error);
    if (onError && error instanceof Error) {
      onError(error);
    } else if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(String(error));
    }
  }
}