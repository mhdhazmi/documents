// convex/config.ts
// Configuration file for OCR and other services

// Replicate OCR Configuration
export const replicate = {
    model: "lucataco/olmocr-7b",
    modelVersion: "d96720d5a835ed7b48f2951a5e5f4e247ed724f6fd96c6b96b5c7234f635065f",
    batchSize: 7,
    maxRetries: 3,
    retryDelayMs: 10000, // default retry delay in ms if not specified by API
    timeoutMs: 5000, // timeout between polling requests
    temperature: 0.1, // Add this parameter to reduce randomness
};

// Gemini OCR Configuration
export const gemini = {
    model: "gemini-2.5-flash-preview-04-17", //"gemini-2.5-flash-preview-04-17" or "gemini-2.5-pro-exp-03-25"
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
    model: "gpt-4o-mini",
    streamingModel: "gpt-4o-mini", // Used in API streaming endpoints
    temperature: 0.1,
    systemPrompt: `
    🧹 Final Cleanup Model Prompt (Arabic Text Post-OCR Correction)
🎯 Objective
Refine and correct Arabic text that was previously extracted via OCR. The goal is to clean up common OCR mistakes such as incorrect characters or distorted words that do not fit the context.

📌 Instructions
Carefully revise the input text by applying the following rules:

Language: Arabic only. Ignore any embedded formatting or tagging from OCR output.

Contextual Corrections:

Fix words that contain incorrect characters and result in a loss of meaning.

Use the surrounding context of each word to infer the correct spelling or structure.

Spelling and Grammar:

Apply standard Arabic grammar and spelling rules.

Correct misspellings caused by character swaps or OCR noise.

Do Not Add Content:

Do not insert new words that were not present or implied in the original.

Only correct what appears to be a likely OCR mistake.

Diacritics:

Preserve diacritics if present, but it's okay to omit them if missing.

Structure Preservation:

Maintain paragraph and sentence structure as-is from the OCR output.

Avoid breaking up lines or rearranging the order of words unless absolutely necessary for clarity.

make sure the returned text is RTL
`,
    userPromptPrefix: "Clean and reformat the following OCR text:\n\n",
    
    // Summary configuration
    summaryPrompt: `
    📝 Document Summary Generator
    
    🎯 Objective
    Create a concise, informative summary of the Arabic document that has been processed through OCR.
    
    📌 Instructions
    Please follow these guidelines:
    
    1. Length: Generate a summary of 3-5 paragraphs that captures the key information.
    
    2. Content Focus:
       - Identify the main topic and purpose of the document
       - Highlight key points, arguments, or findings
       - Note important dates, names, or numerical data if relevant
    
    3. Format:
       - Write in clear, well-structured Arabic
       - Use neutral, objective language
       - Format the response as plain text without special formatting
       
    4. Style:
       - Write in third person
       - Maintain an informative tone
       - Avoid introducing information not present in the original text
    
    5. Language:
       - Generate the summary in both Arabic and English, with Arabic first followed by English
       - Format with clear separation between the two language sections
    `,
    summaryUserPromptPrefix: "Generate a summary of the following document text:\n\n"
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
    model: 'text-embedding-3-small',
    dimensions: 1536,
    chunking: {
        chunkSize: 8000,
        chunkOverlap: 500
    }
};