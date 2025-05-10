// src/app/pdf/pages/streamCleanPage.ts (update with debounce)
import { Id } from "../../../../convex/_generated/dataModel";
import debounce from 'lodash.debounce';

export async function streamCleanPage(
  pageId: Id<"pages">, 
  src: "gemini" | "replicate", 
  onChunk: (c: string) => void,
  onError?: (error: Error) => void
): Promise<void> {
  console.log(`Starting stream cleaning for ${src} OCR of page ${pageId}`);
  
  try {
    const resp = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL_HTTP}/cleanPage`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Origin": window.location.origin
      },
      body: JSON.stringify({ pageId, source: src }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`Error from cleanPage endpoint (${resp.status}):`, errorText);
      throw new Error(`Server error: ${resp.status} - ${errorText}`);
    }

    if (!resp.body) {
      throw new Error('Response body is null');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    
    // Create debounced update function
    const debouncedUpdate = debounce(onChunk, 300);
    
    // Start with an empty update to indicate streaming has begun
    onChunk("");
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const newChunk = decoder.decode(value, { stream: true });
      fullText += newChunk;
      
      // Use debounced update for smoother UI
      debouncedUpdate(fullText);
    }
    
    // Ensure final text is processed with any remaining decoder content
    const finalChunk = decoder.decode();
    if (finalChunk) {
      fullText += finalChunk;
    }
    
    // Flush pending debounced calls and do final update
    debouncedUpdate.flush();
    onChunk(fullText);
    
    console.log(`Completed stream cleaning for ${src} OCR of page ${pageId}`);
  } catch (error) {
    console.error(`Stream clean error for ${src} OCR of page ${pageId}:`, error);
    if (onError && error instanceof Error) {
      onError(error);
    } else if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(String(error));
    }
  }
}