# OCR Configuration System

This document explains the configuration system for the OCR functionality in the Convex application.

## Overview

All configuration values for the OCR system have been centralized in the `convex/config.ts` file. This allows for easy customization of various aspects of the OCR functionality without having to modify the code directly.

## Configuration Structure

The configuration is organized into several sections:

### Replicate OCR Configuration

```typescript
export const replicate = {
  model: "lucataco/olmocr-7b",
  modelVersion: "d96720d5a835ed7b48f2951a5e5f4e247ed724f6fd96c6b96b5c7234f635065f",
  batchSize: 5,
  maxRetries: 3,
  retryDelayMs: 10000, // default retry delay in ms if not specified by API
  timeoutMs: 5000, // timeout between polling requests
};
```

- `model`: The Replicate model to use for OCR
- `modelVersion`: The specific model version to use
- `batchSize`: Number of pages to process in parallel
- `maxRetries`: Maximum number of retry attempts for failed API calls
- `retryDelayMs`: Default delay between retries in milliseconds
- `timeoutMs`: Timeout for polling requests

### Gemini OCR Configuration

```typescript
export const gemini = {
  model: "gemini-1.5-flash",
  fileProcessingPollingIntervalMs: 5000,
  prompt: "Perform OCR on the PDF document and extract the text content. Return the text content in a structured format, including headers, paragraphs, and tables. Do not change the original language of the document."
};
```

- `model`: The Gemini model to use for OCR
- `fileProcessingPollingIntervalMs`: Polling interval when waiting for file processing
- `prompt`: The prompt to send to Gemini for OCR extraction

### OpenAI Configuration

```typescript
export const openai = {
  model: "gpt-4o",
  temperature: 0.3,
  systemPrompt: "You are an expert at cleaning and formatting OCR text. Your job is to take raw OCR output and clean it up - fix formatting issues, correct obvious OCR errors, properly structure paragraphs, tables, and sections. Preserve all original content but make it more readable.",
  userPromptPrefix: "Clean and reformat the following OCR text:\n\n"
};
```

- `model`: The OpenAI model to use for text cleanup
- `temperature`: The temperature parameter for the API call
- `systemPrompt`: The system prompt to send to OpenAI
- `userPromptPrefix`: The prefix to add to the user prompt

### General OCR Configuration

```typescript
export const ocr = {
  performOcrPrompt: "Perform OCR on the following document, clean the text and translate it to both English and Arabic\ntext = {'Arabic': string, 'English': string}\nReturn: Array<text>",
  statusTypes: {
    processing: "processing",
    success: "success",
    failed: "failed"
  }
};
```

- `performOcrPrompt`: The prompt used in the main OCR functionality
- `statusTypes`: Standard status types used across the application

## How to Customize

To modify any of these settings, simply edit the `convex/config.ts` file and update the values as needed. The changes will be applied the next time the corresponding code runs.

For example, to update the OpenAI model:

```typescript
// In convex/config.ts
export const openai = {
  model: "gpt-4-turbo", // Changed from gpt-4o to gpt-4-turbo
  temperature: 0.3,
  // ...other settings...
};
```

## Adding New Configuration

If you need to add new configuration values:

1. Add them to the appropriate section in `convex/config.ts`
2. Import the configuration in the file where you need to use it
3. Use the imported configuration values instead of hardcoded ones

Example:

```typescript
// In your file
import { openai as openaiConfig } from "../../config";

// Use the configuration
const response = await openai.chat.completions.create({
  model: openaiConfig.model,
  // ...other settings...
});
``` 