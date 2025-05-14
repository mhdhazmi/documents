export async function streamClean(
  jobId: string, 
  src: "gemini" | "replicate", 
  onChunk: (c: string) => void,
  onError?: (error: Error) => void
): Promise<void> {
  console.warn(`DEPRECATED: streamClean is no longer supported - use streamCleanPage or firstPage endpoints`);
  
  // Show feedback that the legacy endpoint is not available
  onChunk("تم تحديث النظام. يرجى تحديث المتصفح للاستمرار.");
  
  if (onError) {
    onError(new Error("Legacy OCR pipeline has been removed"));
  } else {
    throw new Error("Legacy OCR pipeline has been removed");
  }
}