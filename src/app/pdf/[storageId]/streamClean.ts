export async function streamClean(jobId: string, src: "gemini" | "replicate", onChunk: (c: string) => void) {
  console.log("streamClean", jobId, src);
  console.log(window.location.origin);
  console.log(process.env.NEXT_PUBLIC_CONVEX_URL_HTTP);
  const resp = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL_HTTP}/clean`, {
    method: "POST",
    headers: { "Content-Type": "application/json",
                    "Origin": window.location.origin
    },
    body: JSON.stringify({ pdfId: jobId, source: src }),
  });


  if (!resp.ok) {
    // Handle error responses
    const errorText = await resp.text();
    console.error("Error from clean endpoint:", errorText);
    throw new Error(`Error from server: ${resp.status} - ${errorText}`);
  }

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