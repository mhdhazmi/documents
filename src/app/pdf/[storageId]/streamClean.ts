export async function streamClean(jobId: string, src: "gemini" | "replicate", onChunk: (c: string) => void) {
  const resp = await fetch("https://dusty-meerkat-258.convex.site", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfId: jobId, source: src }),
  });

  const reader = resp.body!.getReader();
  const dec = new TextDecoder("utf-8");
  let fullText = "";
  let lastUpdateTime = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const newChunk = dec.decode(value);
    fullText += newChunk;
    
    // Only update every 100ms to reduce jitter
    const now = Date.now();
    if (now - lastUpdateTime > 100) {
      onChunk(fullText);
      lastUpdateTime = now;
    }
  }
  
  // Make sure the final text is shown
  onChunk(fullText);
}