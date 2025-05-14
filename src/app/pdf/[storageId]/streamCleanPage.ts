export async function streamCleanPage(
  pageId: string, 
  src: "gemini" | "replicate", 
  onChunk: (c: string) => void,
  onError?: (error: Error) => void
): Promise<void> {
  console.log(`Starting stream cleaning for ${src} OCR of page ${pageId}`);
  
  try {
    // Make sure we have a valid Convex URL
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL is not defined');
    }
    
    // Ensure pageId is a string (in case it's passed as an Id object)
    const pageIdStr = pageId.toString();
    
    const resp = await fetch(`${convexUrl.replace("convex.cloud", "convex.site")}/cleanPage`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Origin": window.location.origin 
      },
      body: JSON.stringify({ pageId: pageIdStr, source: src }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Error from cleanPage endpoint (${resp.status}):`, errorText);
      throw new Error(`Error from cleanPage endpoint (${resp.status}): ${errorText}`);
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
    console.log(`Completed stream cleaning for ${src} OCR of page ${pageId}`);
  } catch (err) {
    const error = err as Error;
    console.error(`Stream clean error for ${src} OCR of page ${pageId}:`, error);
    if (onError) {
      onError(error);
    } else {
      throw error;
    }
  }
}