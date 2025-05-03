// convex/config.ts
// Configuration file for OCR and other services

// Replicate OCR Configuration
export const replicate = {
    model: "lucataco/olmocr-7b",
    modelVersion: "d96720d5a835ed7b48f2951a5e5f4e247ed724f6fd96c6b96b5c7234f635065f",
    batchSize: 5,
    maxRetries: 3,
    retryDelayMs: 10000, // default retry delay in ms if not specified by API
    timeoutMs: 5000, // timeout between polling requests
};

// Gemini OCR Configuration
export const gemini = {
    model: "gemini-2.5-pro-exp-03-25",
    fileProcessingPollingIntervalMs: 1000,
    prompt: `🎯 Objective
Perform high-accuracy OCR (Optical Character Recognition) on Arabic-language documents. The input may be a scanned document, photographed text, or a PDF containing Arabic script.

📌 Instructions
Please follow these guidelines strictly:

Language: Arabic only. Do not detect or output any other language.

Direction: Read text from right to left.

Tags: 🚫 Do not include any XML, HTML, or formatting tags in the output. Only raw text is required.

Diacritics: Preserve Arabic diacritics (like َ ُ ِ ّ ) if they exist in the original image.

Punctuation & Symbols: Preserve punctuation marks (، ؛ ؟ .) and numerals as they appear.

Character Forms: Recognize context-based Arabic letter shapes (isolated, initial, medial, final).

Ligatures: Correctly handle common ligatures such as "لا" and words where characters are joined naturally.

Line and Paragraph Structure:

Maintain logical order and spacing of lines.

Avoid inserting artificial line breaks unless they exist in the original.

Mixed Content:

If non-Arabic text (e.g. English words, numbers) is present, retain it only if part of the original content.

Preserve inline structure (e.g. English terms within Arabic sentences).`
};

// OpenAI Configuration
export const openai = {
    model: "gpt-4o",
    streamingModel: "gpt-4o",
    temperature: 0.1,
    systemPrompt: `
      🔄 Multilingual Document Processing (Arabic Focus)
      
      Process the given OCR text (primarily in Arabic) and return the following:
      
      1. Cleaned Arabic text: Fix OCR errors, improve formatting, ensure proper RTL.
      2. English translation: Provide an accurate translation of the text.
      3. Keywords in Arabic: Extract 5-10 significant keywords describing the document content.
      4. Keywords in English: Translate the keywords to English.
      
      IMPORTANT: You must return your answer in this exact JSON format:
      {
        "arabic": "cleaned Arabic text",
        "english": "English translation",
        "keywordsArabic": ["keyword1", "keyword2", ...],
        "keywordsEnglish": ["keyword1", "keyword2", ...]
      }
      
      Do not include any other text outside of this JSON structure. The response must be valid JSON.
      `,
    userPromptPrefix: "Clean, translate, and extract keywords from the following OCR text:\n\n"
  };
// General OCR Configuration
export const ocr = {
    performOcrPrompt: "Perform OCR on the following document, clean the text and translate it to both English and Arabic\ntext = {'Arabic': string, 'English': string}\nReturn: Array<text>",
    statusTypes: {
        processing: "processing",
        success: "success",
        failed: "failed"
    }
}; 

// Embedding configuration
export const embedding = {
    model: 'text-embedding-3-large',
    dimensions: 3072,
    chunking: {
        chunkSize: 2000,
        chunkOverlap: 100
    }
};