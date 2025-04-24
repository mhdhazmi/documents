export async function streamClean(jobId: string, src: "gemini" | "replicate", onChunk: (c: string) => void) {
  console.log("Entering streamClean")
  console.log(jobId, src)
    const resp = await fetch("https://hearty-porpoise-965.convex.site/clean", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pdfId: jobId, source: src }),
    });
  
    const reader = resp.body!.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(dec.decode(value));
    }
  }