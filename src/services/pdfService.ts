/**
 * Upload a PDF file using the provided mutation functions
 */
export const uploadPDF = async (
  file: File,
  pageCount: number,
  generateUploadUrl: () => Promise<string>,
  sendPDF: (args: { fileId: string, filename: string, fileSize: number, pageCount: number }) => Promise<string>,
  processWithMultipleOcrMutation: (args: { pdfId: string }) => Promise<void>
) => {
  // Step 1: Get a short-lived upload URL
  const postUrl = await generateUploadUrl();
  
  // Step 2: POST the file to the URL
  const result = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  
  const { storageId } = await result.json();
  
  // Step 3: Save the newly allocated storage id and page count to the database
  const pdfId = await sendPDF({ 
    fileId: storageId, 
    filename: file.name, 
    fileSize: file.size,
    pageCount: pageCount || 0
  });

  // Step 4: Process the PDF with OCR
  await processWithMultipleOcrMutation({ pdfId: pdfId });

  return pdfId;
}; 